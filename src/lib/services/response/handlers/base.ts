import { ContentType } from '../../../types/contentTypes'
import { PineconeMetadata } from '../../metadata/types/pinecone'
import { HandlerConfig } from '../../../types/HandlerConfig'

export interface HandlerResponse {
  type: string
  text: string
  confidence: number
  metadata: {
    source: string
    timestamp: string
    [key: string]: any
  }
}

export interface HandlerContext {
  metadata: PineconeMetadata
  previousResponses?: HandlerResponse[]
  query: string
}

/**
 * Interface für alle domänenspezifischen Handler
 */
export interface IResponseHandler {
  canHandle(metadata: PineconeMetadata): boolean
  generateResponse(context: HandlerContext): Promise<HandlerResponse>
  getConfig(): HandlerConfig
}

/**
 * Abstrakte Basisklasse für Response-Handler
 */
export abstract class BaseResponseHandler implements IResponseHandler {
  protected readonly templateId: string
  protected config: HandlerConfig

  constructor(templateId: string, config: HandlerConfig) {
    this.templateId = templateId
    this.config = config
  }

  abstract canHandle(metadata: PineconeMetadata): boolean
  abstract generateResponse(context: HandlerContext): Promise<HandlerResponse>

  protected calculateConfidence(response: HandlerResponse, context: HandlerContext): number {
    return response.confidence || 0.5
  }

  getConfig(): HandlerConfig {
    return this.config
  }

  protected getDefaultResponse(context: HandlerContext): HandlerResponse {
    return {
      type: 'default',
      text: 'Keine spezifische Antwort verfügbar.',
      confidence: 0.1,
      metadata: {
        source: 'base_handler',
        timestamp: new Date().toISOString()
      }
    }
  }

  protected formatDate(date: string): string {
    try {
      return new Date(date).toLocaleDateString('de-DE')
    } catch {
      return date
    }
  }

  protected isDateInRange(date: string, start: string, end?: string): boolean {
    try {
      const dateObj = new Date(date)
      const startObj = new Date(start)
      const endObj = end ? new Date(end) : null

      return endObj
        ? dateObj >= startObj && dateObj <= endObj
        : dateObj >= startObj
    } catch {
      return false
    }
  }

  protected containsAny(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword))
  }
} 