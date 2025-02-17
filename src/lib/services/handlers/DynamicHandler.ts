/**
 * Primary handler implementation for processing all types of requests
 * @status active
 * @usage high
 * @core true
 * 
 * This is the main handler implementation that should be used for all new handler requirements.
 * It provides a flexible configuration system that can handle various types of requests
 * without requiring new handler implementations.
 * 
 * @example
 * const handler = new DynamicHandler(context, {
 *   type: 'custom',
 *   name: 'CustomHandler',
 *   active: true,
 *   // ... additional configuration
 * });
 */

import { BaseHandler, HandlerContext, HandlerRequest } from './base'
import { ContentType, StructuredResponse } from '../search/types'
import { DynamicHandlerConfig } from './types'

export class DynamicHandler extends BaseHandler {
  public config: DynamicHandlerConfig

  constructor(context: HandlerContext, config: DynamicHandlerConfig) {
    super(context, {
      type: 'dynamic',
      name: config.name,
      active: config.active,
      priority: config.priority,
      responseType: config.responseType
    })
    this.config = config
  }

  async canHandle(request: HandlerRequest): Promise<boolean> {
    if (!this.config.active) return false

    const query = request.query.toLowerCase()
    
    // Prüfe zuerst auf Identitätsfragen
    if (this.isIdentityQuestion(query)) {
      return true
    }
    
    // Prüfen auf Übereinstimmungen mit Response-Patterns
    const hasPatternMatch = this.config.responses.some(response => {
      if (!response.conditions?.patterns) return false
      return response.conditions.patterns.some(pattern => {
        const regex = new RegExp(pattern, 'i')
        return regex.test(query)
      })
    })

    // Nur wenn keine direkte Übereinstimmung, dann Semantic Matching
    if (!hasPatternMatch) {
      const semanticScore = await this.calculateSemanticScore(query)
      return semanticScore >= this.config.settings.matchThreshold
    }

    return hasPatternMatch
  }

  private isIdentityQuestion(query: string): boolean {
    const identityPatterns = [
      'wer bist du',
      'was bist du',
      'was kannst du',
      'wie funktionierst du',
      'was machst du',
      'wer sind sie',
      'was sind sie'
    ]
    return identityPatterns.some(pattern => query.includes(pattern))
  }

  private async calculateSemanticScore(query: string): Promise<number> {
    try {
      // Hier können wir später die Semantic Search integrieren
      // Aktuell ein einfacher Vergleich
      const topics = this.config.metadata.keyTopics.join(' ').toLowerCase()
      const words = query.split(' ')
      const matchingWords = words.filter(word => topics.includes(word))
      return matchingWords.length / words.length
    } catch (error) {
      console.error('Fehler bei der semantischen Analyse:', error)
      return 0
    }
  }

  async handle(request: HandlerRequest): Promise<StructuredResponse> {
    try {
      const query = request.query.toLowerCase()
      
      // Direkte Verarbeitung für Identitätsfragen
      if (this.isIdentityQuestion(query)) {
        const identityResponse = this.config.responses.find(r => r.type === 'identity')
        if (!identityResponse) {
          throw new Error('Keine Identitätsantwort konfiguriert')
        }
        
        return {
          type: this.config.responseType,
          answer: this.fillTemplate(identityResponse, request.metadata),
          confidence: 1.0,
          metadata: {
            handler: this.config.name,
            topics: [],
            entities: [],
            suggestedQuestions: []
          }
        }
      }

      // Normale Verarbeitung für andere Anfragen
      const response = this.findMatchingResponse(request)
      if (!response) {
        throw new Error('Keine passende Antwort gefunden')
      }

      return {
        type: this.config.responseType,
        answer: this.fillTemplate(response, request.metadata),
        confidence: 1.0,
        metadata: {
          handler: this.config.name,
          topics: this.config.metadata.keyTopics,
          entities: this.config.metadata.entities,
          suggestedQuestions: this.config.metadata.relatedTopics.suggestedQuestions
        }
      }
    } catch (error) {
      console.error('Fehler bei der Antwortgenerierung:', error)
      throw error
    }
  }

  private findMatchingResponse(request: HandlerRequest) {
    return this.config.responses.find(response => {
      if (!response.conditions?.patterns) return false
      
      return response.conditions.patterns.some(pattern => 
        new RegExp(pattern, 'i').test(request.query)
      )
    })
  }

  private fillTemplate(
    response: DynamicHandlerConfig['responses'][0], 
    metadata?: Record<string, any>
  ): string {
    const template = response.templates[
      Math.floor(Math.random() * response.templates.length)
    ]
    
    return template.replace(/\{([^}]+)\}/g, (match, key) => {
      const value = key.split('.').reduce((obj: any, k: string) => 
        obj?.[k], metadata)
      return value || match
    })
  }
} 