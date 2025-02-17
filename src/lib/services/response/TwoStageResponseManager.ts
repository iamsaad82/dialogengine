import { OpenAI } from 'openai'
import { FeatureManager } from '../../config/features'
import { 
  Response, 
  HandlerResponse,
  VectorResponse,
  HybridResponse,
  ResponseContext, 
  FeedbackData,
  HandlerResponseMetadata,
  VectorResponseMetadata,
  HybridResponseMetadata
} from '../../types'
import { PineconeMetadata } from '../metadata/types/pinecone'
import { ResponseHandlerFactory } from './handlers/factory'
import { VectorResponseGenerator } from './vector/VectorResponseGenerator'

interface ResponseStrategy {
  type: 'handler' | 'vector' | 'hybrid'
  confidence: number
  context: ResponseContext
}

export class TwoStageResponseManager {
  private readonly confidenceThreshold = 0.7
  private readonly handlerFactory: ResponseHandlerFactory
  private readonly vectorGenerator: VectorResponseGenerator
  private readonly featureManager: FeatureManager
  private readonly feedbackStore: Map<string, FeedbackData> = new Map()

  constructor(config: {
    openaiApiKey: string
    pineconeApiKey: string
    pineconeEnvironment: string
    pineconeIndex: string
    namespace?: string
  }) {
    this.handlerFactory = ResponseHandlerFactory.getInstance()
    this.vectorGenerator = new VectorResponseGenerator(config)
    this.featureManager = FeatureManager.getInstance()
  }

  private async getHandlerResponse(query: string, context: ResponseContext): Promise<HandlerResponse> {
    if (!context.metadata) {
      throw new Error('Keine Metadaten für Handler-Response verfügbar')
    }

    const handler = this.handlerFactory.getHandler(context.templateId, context.metadata)
    const response = await handler.generateResponse(query)

    const metadata: HandlerResponseMetadata = {
      source: 'handler',
      responseId: crypto.randomUUID(),
      timestamp: Date.now(),
      templateId: context.templateId,
      handlerId: handler.getId(),
      handlerType: handler.getType()
    }

    return {
      content: response.content,
      confidence: response.confidence,
      type: 'handler',
      metadata
    }
  }

  /**
   * Generiert eine optimale Antwort durch Kombination von Handler- und Vektor-basierten Antworten
   */
  async getResponse(query: string, context: ResponseContext): Promise<Response> {
    if (!context.templateId) {
      throw new Error('templateId ist erforderlich')
    }

    // Bestimme die optimale Strategie
    const strategy = await this.determineStrategy(query, context)
    
    // Hole die primäre Antwort
    const primaryResponse = await this.getPrimaryResponse(query, context, strategy)

    // Prüfe, ob eine zweite Stufe benötigt wird
    if (this.needsSecondStage(primaryResponse, strategy)) {
      const secondaryResponse = await this.getSecondaryResponse(query, context, primaryResponse)
      return this.combineResponses(primaryResponse, secondaryResponse)
    }

    return primaryResponse
  }

  /**
   * Bestimmt die optimale Antwortstrategie
   */
  private async determineStrategy(query: string, context: ResponseContext): Promise<ResponseStrategy> {
    const useImprovedHandlers = this.featureManager.isEnabled(
      'improvedHandlers',
      { templateId: context.templateId }
    )

    // Wenn verbesserte Handler aktiviert sind und Metadaten vorhanden sind
    if (useImprovedHandlers && context.metadata) {
      const handler = this.handlerFactory.getHandler(context.templateId, context.metadata)
      if (handler.canHandle(context.metadata)) {
        return {
          type: 'handler',
          confidence: 0.8,
          context
        }
      }
    }

    const useHybridResponses = this.featureManager.isEnabled(
      'hybridResponses',
      { templateId: context.templateId }
    )

    // Bei vorherigen Antworten und aktivierten Hybrid-Responses
    if (useHybridResponses && context.metadata) {
      return {
        type: 'hybrid',
        confidence: 0.9,
        context
      }
    }

    const useVectorSearch = this.featureManager.isEnabled(
      'vectorSearch',
      { templateId: context.templateId }
    )

    // Wenn Vektorsuche aktiviert ist
    if (useVectorSearch) {
      return {
        type: 'vector',
        confidence: 0.7,
        context
      }
    }

    // Fallback: Einfache Handler-basierte Antwort
    return {
      type: 'handler',
      confidence: 0.6,
      context
    }
  }

  /**
   * Generiert die primäre Antwort basierend auf der Strategie
   */
  private async getPrimaryResponse(
    query: string, 
    context: ResponseContext, 
    strategy: ResponseStrategy
  ): Promise<Response> {
    switch (strategy.type) {
      case 'handler':
        return this.getHandlerResponse(query, context)
      case 'vector':
        return this.getVectorResponse(query, context)
      case 'hybrid':
        return this.getHybridResponse(query, context)
      default:
        throw new Error(`Unbekannte Strategie: ${strategy.type}`)
    }
  }

  /**
   * Prüft ob eine zweite Antwortstufe benötigt wird
   */
  private needsSecondStage(
    response: Response,
    strategy: ResponseStrategy
  ): boolean {
    const useHybridResponses = this.featureManager.isEnabled(
      'hybridResponses',
      { templateId: strategy.context.templateId }
    )

    // Wenn Hybrid-Responses deaktiviert sind
    if (!useHybridResponses) {
      return false
    }

    // Wenn die Konfidenz unter dem Schwellenwert liegt
    if (response.confidence < this.confidenceThreshold) {
      return true
    }

    // Bei Hybrid-Strategie immer zweite Phase
    if (strategy.type === 'hybrid') {
      return true
    }

    // Bei Handler-Strategie nur wenn Konfidenz niedrig
    if (strategy.type === 'handler' && response.confidence < 0.9) {
      return true
    }

    return false
  }

  /**
   * Generiert eine sekundäre Antwort zur Verbesserung der primären
   */
  private async getSecondaryResponse(
    query: string,
    context: ResponseContext,
    primaryResponse: Response
  ): Promise<Response> {
    // Wenn primäre Antwort vom Handler kam, nutze Vektor
    if (primaryResponse.source === 'handler') {
      return this.getVectorResponse(query, {
        ...context,
        metadata: {
          ...context.metadata,
          previousResponses: [...(context.metadata as Record<string, any>['previousResponses'] || []), primaryResponse]
        }
      })
    }

    // Wenn primäre Antwort vom Vektor kam und Handler verfügbar, nutze Handler
    if (primaryResponse.source === 'vector' && context.metadata) {
      return this.getHandlerResponse(query, {
        ...context,
        metadata: {
          ...context.metadata,
          previousResponses: [...(context.metadata as Record<string, any>['previousResponses'] || []), primaryResponse]
        }
      }).catch(() => primaryResponse)
    }

    return primaryResponse
  }

  /**
   * Kombiniert zwei Antworten zu einer optimierten Gesamtantwort
   */
  private combineResponses(response1: Response, response2: Response): Response {
    // Wähle die Antwort mit der höheren Konfidenz als Basis
    const [primary, secondary] = response1.confidence >= response2.confidence
      ? [response1, response2]
      : [response2, response1]

    // Kombiniere die Metadaten
    const combinedMetadata = {
      ...primary.metadata,
      ...secondary.metadata,
      sources: [primary.source, secondary.source]
    }

    // Berechne die kombinierte Konfidenz
    const combinedConfidence = Math.min(
      1,
      (primary.confidence * 0.7 + secondary.confidence * 0.3)
    )

    return {
      type: primary.type,
      text: primary.text,
      confidence: combinedConfidence,
      source: 'hybrid',
      metadata: combinedMetadata
    }
  }

  /**
   * Generiert eine Vektor-basierte Antwort
   */
  private async getVectorResponse(query: string, context: ResponseContext): Promise<VectorResponse> {
    const vectorResponse = await this.vectorGenerator.generateResponse({
      query,
      templateId: context.templateId,
      metadata: context.metadata
    })

    const metadata: VectorResponseMetadata = {
      source: 'vector',
      responseId: crypto.randomUUID(),
      timestamp: Date.now(),
      templateId: context.templateId,
      similarity: vectorResponse.similarity,
      matchedDocuments: vectorResponse.matchedDocuments
    }

    return {
      content: vectorResponse.content,
      confidence: vectorResponse.similarity,
      type: 'vector',
      metadata
    }
  }

  /**
   * Generiert eine hybride Antwort durch Kombination von Handler und Vektor
   */
  private async getHybridResponse(query: string, context: ResponseContext): Promise<HybridResponse> {
    const [handlerResponse, vectorResponse] = await Promise.all([
      this.getHandlerResponse(query, context),
      this.getVectorResponse(query, context)
    ])

    return {
      content: this.combineContent(handlerResponse.content, vectorResponse.content),
      confidence: Math.max(handlerResponse.confidence, vectorResponse.confidence),
      type: 'hybrid',
      metadata: {
        source: 'hybrid',
        responseId: crypto.randomUUID(),
        timestamp: Date.now(),
        templateId: context.templateId,
        handlerConfidence: handlerResponse.confidence,
        vectorSimilarity: vectorResponse.confidence
      }
    }
  }

  private combineContent(handlerContent: string, vectorContent: string): string {
    // Implementiere eine intelligente Kombination der Inhalte
    return `${handlerContent}\n\nZusätzliche Informationen:\n${vectorContent}`
  }

  /**
   * Prüft ob eine Antwort unvollständig erscheint
   */
  private isIncompleteResponse(response: Response): boolean {
    // Einfache Heuristiken für Unvollständigkeit
    if (response.text.length < 50) return true
    if (response.text.includes('...')) return true
    if (response.text.toLowerCase().includes('nicht gefunden')) return true
    
    return false
  }

  /**
   * Verschmilzt zwei Antworttexte intelligent
   */
  private mergeResponseTexts(primary: string, secondary: string): string {
    // Entferne Duplikate und redundante Informationen
    const cleanSecondary = this.removeRedundantInfo(primary, secondary)
    
    // Wenn der sekundäre Text keine neuen Informationen enthält
    if (!cleanSecondary) return primary
    
    // Füge die Texte zusammen
    return `${primary}\n\nErgänzende Information:\n${cleanSecondary}`
  }

  /**
   * Entfernt redundante Informationen aus dem sekundären Text
   */
  private removeRedundantInfo(primary: string, secondary: string): string {
    // Teile die Texte in Sätze
    const primarySentences = primary.split(/[.!?]+/).map(s => s.trim())
    const secondarySentences = secondary.split(/[.!?]+/).map(s => s.trim())
    
    // Filtere redundante Sätze
    const uniqueSentences = secondarySentences.filter(sentence => {
      return !primarySentences.some(ps => 
        this.calculateSimilarity(ps, sentence) > 0.8
      )
    })
    
    return uniqueSentences.join('. ')
  }

  /**
   * Berechnet die Ähnlichkeit zwischen zwei Sätzen (einfache Implementierung)
   */
  private calculateSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/))
    const wordsB = new Set(b.toLowerCase().split(/\s+/))
    
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)))
    const union = new Set([...wordsA, ...wordsB])
    
    return intersection.size / union.size
  }

  async processFeedback(feedback: FeedbackData): Promise<void> {
    // Speichere das Feedback
    this.feedbackStore.set(feedback.responseId, feedback)

    // Analysiere das Feedback für Verbesserungen
    await this.analyzeFeedback(feedback)
  }

  private async analyzeFeedback(feedback: FeedbackData): Promise<void> {
    if (feedback.rating < 0.5) {
      // Bei schlechtem Feedback: Passe die Strategie an
      await this.adjustStrategy(feedback)
    }

    // Aktualisiere die Statistiken
    this.updateFeedbackStats(feedback)
  }

  private async adjustStrategy(feedback: FeedbackData): Promise<void> {
    const { source, metadata } = feedback

    if (source === 'handler' && metadata?.handlerType) {
      // Passe die Handler-Konfiguration an
      const handler = this.handlerFactory.getHandler(
        metadata.templateId as string,
        metadata as unknown as PineconeMetadata
      )
      // Implementiere Handler-spezifische Anpassungen
    }

    if (source === 'vector') {
      // Passe die Vector-Suche an
      await this.vectorGenerator.optimizeSearchParameters(metadata || {})
    }
  }

  private updateFeedbackStats(feedback: FeedbackData): void {
    // Implementiere Statistik-Updates
    const stats = {
      totalFeedback: this.feedbackStore.size,
      averageRating: this.calculateAverageRating(),
      sourceDistribution: this.calculateSourceDistribution()
    }

    // Aktualisiere die Metriken
    // TODO: Implementiere Metrik-Updates
  }

  private calculateAverageRating(): number {
    let sum = 0
    let count = 0

    for (const feedback of this.feedbackStore.values()) {
      sum += feedback.rating
      count++
    }

    return count > 0 ? sum / count : 0
  }

  private calculateSourceDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {
      handler: 0,
      vector: 0,
      hybrid: 0
    }

    for (const feedback of this.feedbackStore.values()) {
      distribution[feedback.source]++
    }

    return distribution
  }
}

/**
 * Prüft ob es sich um Stadtverwaltungs-Metadaten handelt
 */
export function isCityAdministrationMetadata(
  metadata: PineconeMetadata
): metadata is PineconeCityAdministrationMetadata {
  return metadata.type === 'cityAdministration' && 'cityAdmin' in metadata
} 