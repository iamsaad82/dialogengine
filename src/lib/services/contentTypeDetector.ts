import { ExtendedDetectionResult, ContentTypeMetadata, BaseContentTypes } from '../types/contentTypes'
import { OpenAIService } from './ai/openai'
import { ProcessedDocument } from './document/types'
import { createHash } from 'crypto'
import { ContentTypeRegistry } from '../types/contentTypes'

interface CacheEntry {
  result: ExtendedDetectionResult
  timestamp: number
}

export class ContentTypeDetector {
  private cache: Map<string, CacheEntry>
  private openai: OpenAIService

  constructor(openai: OpenAIService) {
    this.cache = new Map()
    this.openai = openai
  }

  async detect(content: string): Promise<ExtendedDetectionResult> {
    const cacheKey = this.getCacheKey(content)
    const cached = this.cache.get(cacheKey)

    if (cached && this.isValidCache(cached)) {
      return cached.result
    }

    const result = await this.openai.analyzeContent(content)
    
    // Erstelle die Basis-Metadaten
    const baseMetadata = {
      domain: this.getDomainFromType(result.type),
      subDomain: this.getSubDomainFromType(result.type),
      classification: {
        type: result.type,
        purpose: 'content-classification',
        audience: 'general'
      }
    }

    // Kombiniere mit den vorhandenen Metadaten
    const combinedMetadata = {
      ...baseMetadata,
      ...(result.metadata || {}),
      // Stelle sicher, dass domain und subDomain nicht überschrieben werden
      domain: baseMetadata.domain,
      subDomain: baseMetadata.subDomain,
      generated: true,
      timestamp: new Date().toISOString(),
      source: 'pattern-based-detection'
    }
    
    // Erstelle das angereicherte Ergebnis
    const enrichedResult: ExtendedDetectionResult = {
      ...result,
      patterns: result.patterns || [],
      weight: result.weight || 1.0,
      metadata: combinedMetadata
    }

    this.cache.set(cacheKey, {
      result: enrichedResult,
      timestamp: Date.now()
    })

    return enrichedResult
  }

  private getDomainFromType(type: string): string {
    const parts = type.split('_')
    return parts[0] || 'unknown'
  }

  private getSubDomainFromType(type: string): string {
    const parts = type.split('_')
    return parts.length > 1 ? parts[1] : 'general'
  }

  private getCacheKey(content: string): string {
    return content.slice(0, 100)
  }

  private isValidCache(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < 3600000 // 1 Stunde
  }

  private extractRepresentativeSample(content: string): string {
    // Für XML/HTML-Dokumente
    if (content.trim().startsWith('<?xml') || content.trim().startsWith('<!DOCTYPE html')) {
      return this.extractStructuredSample(content)
    }
    
    // Für normalen Text
    return this.extractTextSample(content)
  }

  private extractStructuredSample(content: string): string {
    try {
      // Extrahiere Root-Element und erste relevante Kinder
      const matches = content.match(/<([^?].*?)>[\s\S]{0,3000}<\/\1>/)
      if (matches) {
        return matches[0]
      }
    } catch (error) {
      console.warn('[ContentTypeDetector] Fehler beim Structured-Sampling:', error)
    }
    
    // Fallback: Nimm die ersten 3000 Zeichen
    return content.slice(0, 3000)
  }

  private extractTextSample(content: string): string {
    // Extrahiere erste 3000 Zeichen, aber beende am letzten vollständigen Satz
    const sample = content.slice(0, 3000)
    const lastSentence = sample.match(/^[\s\S]*[.!?]/)
    return lastSentence ? lastSentence[0] : sample
  }

  private async analyzeWithAI(content: string): Promise<ExtendedDetectionResult> {
    try {
      const response = await this.openai.analyzeContent(content)
      return response
    } catch (error) {
      console.error('Fehler bei der Content-Type-Erkennung:', error)
      return {
        type: BaseContentTypes.TEXT,
        confidence: 0.5,
        patterns: [],
        weight: 1.0,
        metadata: {
          domain: 'text',
          subDomain: 'general',
          classification: {
            type: BaseContentTypes.TEXT,
            purpose: 'fallback',
            audience: 'general'
          },
          generated: true,
          timestamp: new Date().toISOString(),
          source: 'fallback'
        },
        suggestedMetadata: {
          domain: 'text',
          subDomain: 'general',
          classification: {
            type: BaseContentTypes.TEXT,
            purpose: 'fallback',
            audience: 'general'
          }
        }
      }
    }
  }

  private detectType(content: string): string {
    // Implementiere die Typ-Erkennung
    return 'unknown'
  }

  private findMatches(content: string): string[] {
    // Implementiere die Pattern-Suche
    return []
  }

  private calculateConfidence(matches: string[]): number {
    // Implementiere die Konfidenz-Berechnung
    return 0.5
  }
} 