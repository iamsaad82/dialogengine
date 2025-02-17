import { ContentType, ContentMetadata, StructuredResponse } from '../types'
import { HandlerConfig, HandlerContext, HandlerResponse } from './types'

export interface HandlerConfig {
  templateId: string
  language?: string
  redisUrl?: string
}

export interface HandlerContext {
  query: string
  type: ContentType
  metadata?: ContentMetadata
}

export abstract class BaseHandler {
  protected readonly templateId: string
  protected readonly language: string
  protected readonly redisUrl?: string
  protected config: HandlerConfig

  constructor(config: HandlerConfig) {
    this.templateId = config.templateId
    this.language = config.language || 'de'
    this.redisUrl = config.redisUrl
    this.config = config
  }

  /**
   * Prüft, ob dieser Handler für die gegebene Anfrage zuständig ist
   */
  public abstract canHandle(context: HandlerContext): Promise<boolean>

  /**
   * Verarbeitet die Anfrage und generiert eine Antwort
   */
  public abstract handle(context: HandlerContext): Promise<HandlerResponse>

  /**
   * Extrahiert relevante Informationen aus dem vorherigen Kontext
   */
  protected extractFromPreviousContext(context: HandlerContext): {
    topics: string[]
    type?: ContentType
    relevantMetadata: Partial<ContentMetadata>
  } {
    const previousContext = context.metadata?.previousContext
    const history = context.metadata?.history || []
    
    const result = {
      topics: context.metadata?.topics || [],
      type: previousContext?.type,
      relevantMetadata: {}
    }

    // Extrahiere relevante Metadaten aus dem vorherigen Kontext
    if (previousContext?.metadata) {
      const metadata = previousContext.metadata
      if (metadata.requirements) {
        result.relevantMetadata.requirements = metadata.requirements
      }
      if (metadata.coverage) {
        result.relevantMetadata.coverage = metadata.coverage
      }
      if (metadata.costs) {
        result.relevantMetadata.costs = metadata.costs
      }
      if (metadata.actions) {
        result.relevantMetadata.actions = metadata.actions
      }
    }

    return result
  }

  /**
   * Erstellt ein Basis-Metadaten-Objekt
   */
  protected getDefaultMetadata(): ContentMetadata {
    return {
      title: '',
      description: '',
      requirements: [],
      costs: {
        amount: 0,
        currency: 'EUR'
      },
      coverage: {
        included: [],
        excluded: [],
        conditions: []
      },
      actions: [],
      sources: []
    }
  }

  /**
   * Erstellt eine Fehlerantwort
   */
  protected createErrorResponse(error: string): StructuredResponse {
    return {
      type: 'error',
      text: `Ein Fehler ist aufgetreten: ${error}`,
      metadata: {
        ...this.getDefaultMetadata(),
        error
      }
    }
  }

  /**
   * Erstellt eine Standard-Antwort
   */
  protected createResponse(
    type: ContentType,
    text: string,
    metadata?: Partial<ContentMetadata>
  ): StructuredResponse {
    return {
      type,
      text,
      metadata: {
        ...this.getDefaultMetadata(),
        ...metadata
      }
    }
  }

  /**
   * Prüft, ob eine Folgefrage zum gleichen Thema gestellt wurde
   */
  protected isFollowUpQuestion(context: HandlerContext): boolean {
    const previousContext = context.metadata?.previousContext
    if (!previousContext) return false

    // Prüfe ob die aktuelle Frage eine typische Folgefrage ist
    const followUpPatterns = [
      'und',
      'aber',
      'was ist mit',
      'wie sieht es aus mit',
      'gibt es auch',
      'können sie mehr',
      'hast du mehr',
      'was noch',
      'weitere',
      'zusätzlich'
    ]

    const query = context.query.toLowerCase()
    return followUpPatterns.some(pattern => query.includes(pattern))
  }

  protected extractContextFromHistory(history: Array<{ role: string; content: string }>) {
    const lastUserMessage = history
      .reverse()
      .find(msg => msg.role === 'user')

    return {
      lastType: lastUserMessage?.type,
      topics: [],
      metadata: lastUserMessage?.metadata || {}
    }
  }
} 