import { OpenAIService } from './ai/openai'
import { 
  BaseContentType,
  ContentType,
  isValidContentType,
  BaseContentTypes,
  ContentTypeConfig,
  ContentTypeMap,
  ContentTypeMetadata,
  ResponseContentTypes,
  ContentTypes,
  ExtendedDetectionResult as BaseDetectionResult
} from '../types/contentTypes'
import type { ProcessedDocument } from '@/lib/services/document/types'
import type { StructuralElement } from '@/lib/types/structural'
import { createHash } from 'crypto'

export interface DetectionInput {
  text: string
  title: string
  url: string
}

export interface ExtendedDetectionResult extends BaseDetectionResult {
  suggestedMetadata: Record<string, unknown>
}

interface CacheEntry {
  timestamp: number
  result: ExtendedDetectionResult
}

interface Pattern {
  pattern: string
  matches: string[]
}

export class ContentDetector {
  private openai: OpenAIService
  private cache: Map<string, CacheEntry>
  private lastDetectedType: ContentType | null
  private readonly CACHE_TTL = 1000 * 60 * 60 // 1 Stunde
  
  constructor(openai: OpenAIService) {
    this.openai = openai
    this.cache = new Map()
    this.lastDetectedType = null
  }

  private getCacheKey(content: string): string {
    return createHash('md5').update(content).digest('hex')
  }

  private isCacheValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.CACHE_TTL
  }

  private async analyzeWithAI(content: string): Promise<ExtendedDetectionResult> {
    try {
      const response = await this.openai.analyzeContent(content)
      
      // Erweiterte Analyse der Metadaten
      const metadata = {
        domain: response.metadata?.domain || 'unknown',
        subDomain: response.metadata?.subDomain || 'general',
        classification: response.metadata?.classification || {
          type: response.type || BaseContentTypes.DEFAULT,
          purpose: response.metadata?.classification?.purpose || 'content-classification',
          audience: response.metadata?.classification?.audience || 'general',
          confidence: response.confidence || 0.5
        },
        keywords: response.metadata?.keywords || [],
        requirements: response.metadata?.requirements || [],
        coverage: response.metadata?.coverage || [],
        provider: response.metadata?.provider,
        contactPoints: response.metadata?.contactPoints || [],
        generated: true,
        timestamp: new Date().toISOString(),
        source: 'ai-analysis'
      }

      // Verbesserte Typ-Erkennung basierend auf Metadaten
      const detectedType = this.determineTypeFromMetadata(metadata)

      return {
        type: detectedType,
        confidence: response.confidence || 0.5,
        patterns: response.patterns || [],
        weight: response.weight || 1.0,
        metadata,
        suggestedMetadata: {
          domain: metadata.domain,
          subDomain: metadata.subDomain,
          classification: metadata.classification,
          keywords: metadata.keywords,
          requirements: metadata.requirements,
          coverage: metadata.coverage,
          provider: metadata.provider,
          contactPoints: metadata.contactPoints
        }
      }
    } catch (error) {
      console.error('Fehler bei der Content-Type-Erkennung:', error)
      return this.createFallbackResult()
    }
  }

  private determineTypeFromMetadata(metadata: any): BaseContentType {
    const classification = metadata.classification
    const keywords = metadata.keywords || []
    const requirements = metadata.requirements || []
    
    // Priorisierte Typ-Erkennung basierend auf verschiedenen Faktoren
    if (classification?.type && isValidContentType(classification.type)) {
      return classification.type as BaseContentType
    }

    // Analyse der Keywords und Requirements
    const contentIndicators = [...keywords, ...requirements].map(item => item.toLowerCase())
    
    // Dynamische Typ-Erkennung basierend auf Indikatoren
    if (contentIndicators.some(i => i.includes('formular') || i.includes('eingabe'))) {
      return BaseContentTypes.FORM
    }
    if (contentIndicators.some(i => i.includes('profil') || i.includes('person'))) {
      return BaseContentTypes.PROFILE
    }
    if (contentIndicators.some(i => i.includes('standort') || i.includes('adresse'))) {
      return BaseContentTypes.LOCATION
    }
    if (contentIndicators.some(i => i.includes('service') || i.includes('dienstleistung'))) {
      return BaseContentTypes.SERVICE
    }
    if (contentIndicators.some(i => i.includes('produkt') || i.includes('artikel'))) {
      return BaseContentTypes.PRODUCT
    }
    if (contentIndicators.some(i => i.includes('faq') || i.includes('häufige fragen'))) {
      return BaseContentTypes.FAQ
    }
    if (contentIndicators.some(i => i.includes('kontakt') || i.includes('ansprechpartner'))) {
      return BaseContentTypes.CONTACT
    }
    if (contentIndicators.some(i => i.includes('event') || i.includes('veranstaltung'))) {
      return BaseContentTypes.EVENT
    }

    return BaseContentTypes.DEFAULT
  }

  private createFallbackResult(): ExtendedDetectionResult {
    return {
      type: BaseContentTypes.DEFAULT,
      confidence: 0.5,
      patterns: [],
      weight: 1.0,
      metadata: {
        domain: 'unknown',
        subDomain: 'general',
        classification: {
          type: BaseContentTypes.DEFAULT,
          purpose: 'fallback',
          audience: 'general'
        },
        generated: true,
        timestamp: new Date().toISOString(),
        source: 'fallback'
      },
      suggestedMetadata: {
        domain: 'unknown',
        subDomain: 'general',
        classification: {
          type: BaseContentTypes.DEFAULT,
          purpose: 'fallback',
          audience: 'general'
        }
      }
    }
  }

  public async detect(content: string): Promise<ExtendedDetectionResult> {
    const cacheKey = this.getCacheKey(content)
    const cached = this.cache.get(cacheKey)
    
    if (cached && this.isCacheValid(cached)) {
      return cached.result
    }

    try {
      // KI-basierte Analyse durchführen
      const aiResult = await this.analyzeWithAI(content)
      
      // Cache aktualisieren
      this.cache.set(cacheKey, {
        timestamp: Date.now(),
        result: aiResult
      })
      
      // Letzten erkannten Typ speichern
      this.lastDetectedType = aiResult.type
      
      return aiResult
    } catch (error) {
      console.error('Fehler bei der Content-Erkennung:', error)
      return this.createFallbackResult()
    }
  }

  public getLastDetectedType(): ContentType | null {
    return this.lastDetectedType
  }
} 