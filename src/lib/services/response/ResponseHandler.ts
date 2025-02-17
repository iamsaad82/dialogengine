import { ContextManager } from '../context/ContextManager'
import { SearchContext, StructuredResponse } from '../search/types'
import { ContentType, ContentTypeEnum } from '../../types/contentTypes'

interface ResponseConfig {
  maxLength?: number
  formatOptions?: {
    includeMetadata?: boolean
    includeConfidence?: boolean
    formatMarkdown?: boolean
  }
  contextManager?: ContextManager
}

interface EnhancedResponse extends Omit<StructuredResponse, 'type'> {
  enhancedAnswer: string
  type: ContentType
  context?: {
    previousContext?: string
    relatedTopics?: string[]
    followUpQuestions?: string[]
  }
  formatting?: {
    markdown?: boolean
    highlights?: Array<{
      text: string
      reason: string
    }>
  }
}

/**
 * Verarbeitet und optimiert Antworten basierend auf dem Kontext
 */
export class ResponseHandler {
  private readonly config: {
    maxLength: number
    formatOptions: {
      includeMetadata: boolean
      includeConfidence: boolean
      formatMarkdown: boolean
    }
    contextManager?: ContextManager
  }

  constructor(config: ResponseConfig = {}) {
    this.config = {
      maxLength: config.maxLength || 2000,
      formatOptions: {
        includeMetadata: config.formatOptions?.includeMetadata ?? true,
        includeConfidence: config.formatOptions?.includeConfidence ?? true,
        formatMarkdown: config.formatOptions?.formatMarkdown ?? true
      },
      contextManager: config.contextManager
    }
  }

  /**
   * Verarbeitet eine Antwort und optimiert sie basierend auf dem Kontext
   */
  public async processResponse(
    response: StructuredResponse,
    context: SearchContext
  ): Promise<EnhancedResponse> {
    // Basis-Antwort erstellen
    const enhancedResponse: EnhancedResponse = {
      ...response,
      enhancedAnswer: response.answer,
      type: this.determineResponseType(response)
    }

    // Kontext-basierte Optimierungen
    if (this.config.contextManager) {
      enhancedResponse.context = await this.enrichWithContext(response, context)
    }

    // Antwort formatieren
    enhancedResponse.enhancedAnswer = await this.formatResponse(
      enhancedResponse,
      context
    )

    // Länge begrenzen
    if (enhancedResponse.enhancedAnswer.length > this.config.maxLength) {
      enhancedResponse.enhancedAnswer = this.truncateResponse(
        enhancedResponse.enhancedAnswer,
        this.config.maxLength
      )
    }

    return enhancedResponse
  }

  /**
   * Bestimmt den Typ der Antwort
   */
  private determineResponseType(response: StructuredResponse): ContentType {
    if (response.type && Object.values(ContentTypeEnum).includes(response.type)) {
      return response.type as ContentType
    }

    // Fallback-Logik basierend auf Inhalt
    if (response.answer.includes('```')) return ContentTypeEnum.MARKDOWN
    if (response.answer.includes('<')) return ContentTypeEnum.HTML
    return ContentTypeEnum.TEXT
  }

  /**
   * Reichert die Antwort mit Kontext-Informationen an
   */
  private async enrichWithContext(
    response: StructuredResponse,
    context: SearchContext
  ): Promise<EnhancedResponse['context']> {
    const enrichedContext: EnhancedResponse['context'] = {}

    // Vorherigen Kontext extrahieren
    if (context.history?.length) {
      const lastInteraction = context.history[context.history.length - 1]
      if (lastInteraction.role === 'assistant') {
        enrichedContext.previousContext = typeof lastInteraction.content === 'string' 
          ? lastInteraction.content 
          : JSON.stringify(lastInteraction.content)
      }
    }

    // Verwandte Themen identifizieren
    enrichedContext.relatedTopics = this.extractRelatedTopics(response)

    // Follow-up Fragen generieren
    enrichedContext.followUpQuestions = this.generateFollowUpQuestions(
      response,
      context
    )

    return enrichedContext
  }

  /**
   * Formatiert die Antwort basierend auf den Konfigurationsoptionen
   */
  private async formatResponse(
    response: EnhancedResponse,
    context: SearchContext
  ): Promise<string> {
    let formattedResponse = response.enhancedAnswer

    // Markdown-Formatierung
    if (this.config.formatOptions.formatMarkdown) {
      formattedResponse = this.formatMarkdown(formattedResponse)
    }

    // Metadaten hinzufügen
    if (this.config.formatOptions.includeMetadata && response.metadata) {
      formattedResponse = this.addMetadataToResponse(formattedResponse, response)
    }

    // Konfidenz hinzufügen
    if (this.config.formatOptions.includeConfidence && response.confidence) {
      formattedResponse = this.addConfidenceToResponse(formattedResponse, response)
    }

    return formattedResponse
  }

  /**
   * Extrahiert verwandte Themen aus der Antwort
   */
  private extractRelatedTopics(response: StructuredResponse): string[] {
    const topics: string[] = []
    
    // Aus Metadaten
    if (response.metadata?.topics) {
      topics.push(...(response.metadata.topics as string[]))
    }

    // Aus Quellen
    if (response.sources?.length) {
      response.sources.forEach(source => {
        if (source.title) topics.push(source.title)
      })
    }

    return [...new Set(topics)]
  }

  /**
   * Generiert Follow-up Fragen basierend auf der Antwort und dem Kontext
   */
  private generateFollowUpQuestions(
    response: StructuredResponse,
    context: SearchContext
  ): string[] {
    const questions: string[] = []

    // Basierend auf Metadaten
    if (response.metadata?.requirements) {
      questions.push(
        `Welche Voraussetzungen muss ich für ${response.metadata.requirements} erfüllen?`
      )
    }

    // Basierend auf verwandten Themen
    const topics = this.extractRelatedTopics(response)
    topics.slice(0, 2).forEach(topic => {
      questions.push(`Was können Sie mir über ${topic} erzählen?`)
    })

    return questions
  }

  /**
   * Formatiert Markdown-Text
   */
  private formatMarkdown(text: string): string {
    // Überschriften
    text = text.replace(/^#\s+/gm, '### ')
    
    // Listen
    text = text.replace(/^\s*[-*]\s+/gm, '• ')
    
    // Code-Blöcke
    text = text.replace(/```(\w+)?\n/g, '```\n')
    
    return text
  }

  /**
   * Fügt Metadaten zur Antwort hinzu
   */
  private addMetadataToResponse(
    text: string,
    response: EnhancedResponse
  ): string {
    let metadataText = '\n\n---\n'
    
    if (response.sources?.length) {
      metadataText += '\nQuellen:\n'
      response.sources.forEach(source => {
        metadataText += `• ${source.title} (Relevanz: ${Math.round(source.relevance * 100)}%)\n`
      })
    }

    if (response.context?.relatedTopics?.length) {
      metadataText += '\nVerwandte Themen:\n'
      response.context.relatedTopics.forEach(topic => {
        metadataText += `• ${topic}\n`
      })
    }

    return text + metadataText
  }

  /**
   * Fügt Konfidenz-Information zur Antwort hinzu
   */
  private addConfidenceToResponse(
    text: string,
    response: EnhancedResponse
  ): string {
    const confidence = Math.round(response.confidence * 100)
    return `${text}\n\n_Konfidenz: ${confidence}%_`
  }

  /**
   * Kürzt die Antwort auf die maximale Länge
   */
  private truncateResponse(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text

    // Finde den letzten vollständigen Satz
    const truncated = text.substring(0, maxLength)
    const lastSentence = truncated.match(/.*[.!?]/)
    
    if (!lastSentence) return truncated + '...'
    
    return lastSentence[0] + '\n\n_(Antwort wurde gekürzt)_'
  }
} 