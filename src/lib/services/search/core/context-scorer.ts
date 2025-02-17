import { SearchContext, QueryAnalysis } from '../types'

interface ScoringWeights {
  topicMatch: number
  timeRelevance: number
  intentMatch: number
  entityMatch: number
  conversationFlow: number
}

interface ContextualScore {
  score: number
  factors: {
    topicMatchScore: number
    timeRelevanceScore: number
    intentMatchScore: number
    entityMatchScore: number
    conversationFlowScore: number
  }
}

export class ContextScorer {
  private readonly defaultWeights: ScoringWeights = {
    topicMatch: 0.3,
    timeRelevance: 0.1,
    intentMatch: 0.25,
    entityMatch: 0.2,
    conversationFlow: 0.15
  }

  constructor(
    private weights: Partial<ScoringWeights> = {}
  ) {
    this.weights = { ...this.defaultWeights, ...weights }
  }

  /**
   * Bewertet die Relevanz eines Dokuments im aktuellen Kontext
   */
  public scoreDocument(
    document: { content: string; metadata: Record<string, unknown> },
    context: SearchContext,
    analysis: QueryAnalysis
  ): ContextualScore {
    // Topic Match Score
    const topicMatchScore = this.calculateTopicMatch(
      document,
      analysis.topics || []
    )

    // Time Relevance Score
    const timeRelevanceScore = this.calculateTimeRelevance(
      document,
      analysis.timeframe
    )

    // Intent Match Score
    const intentMatchScore = this.calculateIntentMatch(
      document,
      analysis.intent
    )

    // Entity Match Score
    const entityMatchScore = this.calculateEntityMatch(
      document,
      analysis.entities
    )

    // Conversation Flow Score
    const conversationFlowScore = this.calculateConversationFlow(
      document,
      context
    )

    // Gewichtete Gesamtbewertung
    const score = 
      topicMatchScore * this.weights.topicMatch +
      timeRelevanceScore * this.weights.timeRelevance +
      intentMatchScore * this.weights.intentMatch +
      entityMatchScore * this.weights.entityMatch +
      conversationFlowScore * this.weights.conversationFlow

    return {
      score,
      factors: {
        topicMatchScore,
        timeRelevanceScore,
        intentMatchScore,
        entityMatchScore,
        conversationFlowScore
      }
    }
  }

  /**
   * Berechnet die Übereinstimmung mit den erkannten Themen
   */
  private calculateTopicMatch(
    document: { content: string; metadata: Record<string, unknown> },
    topics: string[]
  ): number {
    if (!topics.length) return 0.5 // Neutral wenn keine Themen

    const documentTopics = this.extractTopicsFromDocument(document)
    const matchingTopics = topics.filter(topic => 
      documentTopics.some(docTopic => 
        docTopic.toLowerCase().includes(topic.toLowerCase())
      )
    )

    return matchingTopics.length / topics.length
  }

  /**
   * Extrahiert Themen aus einem Dokument
   */
  private extractTopicsFromDocument(
    document: { content: string; metadata: Record<string, unknown> }
  ): string[] {
    const topics: string[] = []

    // Aus Metadaten
    if (document.metadata.topics) {
      if (Array.isArray(document.metadata.topics)) {
        topics.push(...document.metadata.topics)
      } else if (typeof document.metadata.topics === 'string') {
        topics.push(document.metadata.topics)
      }
    }

    // Aus Kategorien
    if (document.metadata.categories) {
      if (Array.isArray(document.metadata.categories)) {
        topics.push(...document.metadata.categories)
      } else if (typeof document.metadata.categories === 'string') {
        topics.push(document.metadata.categories)
      }
    }

    // Aus Tags
    if (document.metadata.tags) {
      if (Array.isArray(document.metadata.tags)) {
        topics.push(...document.metadata.tags)
      } else if (typeof document.metadata.tags === 'string') {
        topics.push(document.metadata.tags)
      }
    }

    return topics
  }

  /**
   * Bewertet die zeitliche Relevanz
   */
  private calculateTimeRelevance(
    document: { content: string; metadata: Record<string, unknown> },
    timeframe?: string
  ): number {
    if (!timeframe) return 0.5 // Neutral wenn kein Zeitrahmen

    const documentDate = this.extractDateFromDocument(document)
    if (!documentDate) return 0.5 // Neutral wenn kein Datum

    // Zeitrahmen parsen (z.B. "letzte 7 Tage", "dieses Jahr", etc.)
    const timeframeDate = this.parseTimeframe(timeframe)
    if (!timeframeDate) return 0.5

    const timeDiff = Math.abs(documentDate.getTime() - timeframeDate.getTime())
    const maxDiff = 1000 * 60 * 60 * 24 * 365 // 1 Jahr in Millisekunden

    return Math.max(0, 1 - (timeDiff / maxDiff))
  }

  /**
   * Extrahiert das Datum aus einem Dokument
   */
  private extractDateFromDocument(
    document: { content: string; metadata: Record<string, unknown> }
  ): Date | null {
    // Versuche verschiedene Metadaten-Felder
    const dateFields = ['date', 'created', 'updated', 'published']
    
    for (const field of dateFields) {
      const value = document.metadata[field]
      if (value) {
        const date = new Date(value.toString())
        if (!isNaN(date.getTime())) {
          return date
        }
      }
    }

    return null
  }

  /**
   * Parsed einen Zeitrahmen in ein Datum
   */
  private parseTimeframe(timeframe: string): Date | null {
    const now = new Date()
    const lowerTimeframe = timeframe.toLowerCase()

    // Einfache Zeitrahmen-Erkennung
    if (lowerTimeframe.includes('tag')) {
      return new Date(now.setDate(now.getDate() - 1))
    }
    if (lowerTimeframe.includes('woche')) {
      return new Date(now.setDate(now.getDate() - 7))
    }
    if (lowerTimeframe.includes('monat')) {
      return new Date(now.setMonth(now.getMonth() - 1))
    }
    if (lowerTimeframe.includes('jahr')) {
      return new Date(now.setFullYear(now.getFullYear() - 1))
    }

    return null
  }

  /**
   * Bewertet die Übereinstimmung mit der Benutzerabsicht
   */
  private calculateIntentMatch(
    document: { content: string; metadata: Record<string, unknown> },
    intent: string
  ): number {
    if (!intent) return 0.5 // Neutral wenn keine Absicht

    const documentIntent = document.metadata.intent
    if (!documentIntent) return 0.5

    // Einfacher String-Vergleich
    if (typeof documentIntent === 'string') {
      return documentIntent.toLowerCase() === intent.toLowerCase() ? 1 : 0
    }

    return 0.5
  }

  /**
   * Bewertet die Übereinstimmung mit erkannten Entitäten
   */
  private calculateEntityMatch(
    document: { content: string; metadata: Record<string, unknown> },
    entities: Array<{ type: string; value: string }>
  ): number {
    if (!entities.length) return 0.5 // Neutral wenn keine Entitäten

    const documentEntities = this.extractEntitiesFromDocument(document)
    let matches = 0

    for (const entity of entities) {
      if (documentEntities.some(docEntity => 
        docEntity.type === entity.type && 
        docEntity.value.toLowerCase() === entity.value.toLowerCase()
      )) {
        matches++
      }
    }

    return matches / entities.length
  }

  /**
   * Extrahiert Entitäten aus einem Dokument
   */
  private extractEntitiesFromDocument(
    document: { content: string; metadata: Record<string, unknown> }
  ): Array<{ type: string; value: string }> {
    const entities: Array<{ type: string; value: string }> = []

    if (document.metadata.entities) {
      if (Array.isArray(document.metadata.entities)) {
        entities.push(...document.metadata.entities)
      }
    }

    return entities
  }

  /**
   * Bewertet die Relevanz im Konversationsfluss
   */
  private calculateConversationFlow(
    document: { content: string; metadata: Record<string, unknown> },
    context: SearchContext
  ): number {
    if (!context.history?.length) return 0.5 // Neutral wenn keine Historie

    // Betrachte die letzten 3 Nachrichten
    const recentHistory = context.history.slice(-3)
    let flowScore = 0

    recentHistory.forEach((message, index) => {
      const weight = 1 / (index + 1) // Neuere Nachrichten haben mehr Gewicht
      const similarity = this.calculateMessageSimilarity(message.content, document)
      flowScore += similarity * weight
    })

    return flowScore / recentHistory.length
  }

  /**
   * Berechnet die Ähnlichkeit zwischen einer Nachricht und einem Dokument
   */
  private calculateMessageSimilarity(
    message: string | Record<string, unknown>,
    document: { content: string; metadata: Record<string, unknown> }
  ): number {
    const messageText = typeof message === 'string' 
      ? message 
      : JSON.stringify(message)

    // Einfache Wort-Überlappung
    const messageWords = new Set(
      messageText.toLowerCase().split(/\s+/)
    )
    const documentWords = new Set(
      document.content.toLowerCase().split(/\s+/)
    )

    const intersection = new Set(
      [...messageWords].filter(word => documentWords.has(word))
    )

    return intersection.size / Math.max(messageWords.size, documentWords.size)
  }
} 