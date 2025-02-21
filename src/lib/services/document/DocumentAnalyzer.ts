import { HandlerConfig } from '@/lib/types/handler'
import { SchemaDefinition } from '@/lib/types/schema'
import { TemplateConfig } from '@/lib/types/config'
import { OpenAIService } from '@/lib/services/ai/openai'
import { ContentDetector } from '../detector'
import { 
  ContentTypeRegistry, 
  ContentType,
  BaseContentType,
  ExtendedDetectionResult,
  ContentTypeDefinition,
  ContentTypeMetadata,
  DocumentPattern,
  BaseContentTypes,
  isValidContentType,
  ResponseContentType
} from '@/lib/types/contentTypes'
import { createHash } from 'crypto'
import { ContentType as VectorizerContentType } from '@/lib/services/vectorizer'

const DEFAULT_CONTENT_TYPE: ContentType = 'service'

const isValidVectorizerContentType = (type: string): type is ContentType => {
  return ['medical', 'insurance', 'service', 'legal', 'financial', 'education', 'support'].includes(type);
};

export class DocumentAnalyzer {
  private ai: OpenAIService
  private detector: ContentDetector
  private registry: ContentTypeRegistry

  constructor(config: { openaiApiKey: string, registry: ContentTypeRegistry }) {
    this.ai = new OpenAIService({ 
      apiKey: config.openaiApiKey,
      registry: config.registry
    })
    this.detector = new ContentDetector(this.ai)
    this.registry = config.registry
  }

  async analyzeDocuments(files: File[]): Promise<{
    industry: ContentType
    schema: SchemaDefinition
    handlerConfig: HandlerConfig
    templateConfig: TemplateConfig
  }> {
    try {
      // 1. Extrahiere Text aus allen Dokumenten
      const contents = await Promise.all(files.map(file => this.extractContent(file)))
      const combinedContent = contents.join('\n')
      
      // 2. Analysiere jeden Content-Block einzeln
      const contentAnalyses = await Promise.all(
        contents.map(async content => {
          const result = await this.ai.analyzeContent(content)
          return {
            content,
            analysis: result
          }
        })
      )

      // 3. Bestimme den dominanten Content-Type
      const dominantType = this.determineDominantType(contentAnalyses.map(a => a.analysis))

      // 4. Hole die Content-Type Definition
      const contentTypeDef = this.registry.get(dominantType.type)
      if (!contentTypeDef) {
        throw new Error(`Kein passender Content-Type gefunden für: ${dominantType.type}`)
      }

      // 5. Generiere Schema basierend auf Content-Type Definition
      const schema = this.generateSchema(contentTypeDef, contentAnalyses)

      // 6. Erstelle Handler-Konfiguration
      const handlerConfig = await this.generateHandlerConfig(contentTypeDef, schema, contentAnalyses)

      // 7. Erstelle Template-Konfiguration
      const templateConfig = await this.generateTemplateConfig(contentTypeDef, schema, contentAnalyses)

      return {
        industry: dominantType.type,
        schema,
        handlerConfig,
        templateConfig
      }
    } catch (error) {
      console.error('Fehler bei der Dokumentenanalyse:', error)
      throw error
    }
  }

  private determineDominantType(analyses: ExtendedDetectionResult[]): ExtendedDetectionResult {
    // Gruppiere nach Type und berechne durchschnittliche Konfidenz
    const typeGroups = analyses.reduce((groups, analysis) => {
      const type = this.ensureValidContentType(analysis.type)
      if (!groups[type]) {
        groups[type] = {
          count: 0,
          totalConfidence: 0,
          patterns: [],
          weight: 1.0,
          metadata: {
            domain: analysis.metadata?.domain || 'unknown',
            subDomain: analysis.metadata?.subDomain || 'general',
            classification: {
              type: type,
              purpose: 'content-classification',
              audience: 'general'
            }
          },
          suggestedMetadata: {
            domain: analysis.metadata?.domain || 'unknown',
            subDomain: analysis.metadata?.subDomain || 'general',
            classification: {
              type: type,
              purpose: 'content-classification',
              audience: 'general'
            }
          }
        }
      }
      groups[type].count++
      groups[type].totalConfidence += analysis.confidence
      groups[type].patterns = [...groups[type].patterns, ...(analysis.patterns || [])]
      groups[type].metadata = {
        ...groups[type].metadata,
        ...analysis.metadata
      }
      return groups
    }, {} as Record<ContentType, { 
      count: number
      totalConfidence: number
      patterns: Array<{ pattern: string; matches: string[] }>
      weight: number
      metadata: ExtendedDetectionResult['metadata']
      suggestedMetadata: ExtendedDetectionResult['suggestedMetadata']
    }>)

    // Finde den dominanten Typ
    let dominantType: ExtendedDetectionResult = {
      type: BaseContentTypes.DEFAULT,
      confidence: 0,
      patterns: [],
      weight: 1.0,
      metadata: {
        domain: 'unknown',
        subDomain: 'general',
        classification: {
          type: BaseContentTypes.DEFAULT,
          purpose: 'fallback',
          audience: 'general'
        }
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

    for (const [type, data] of Object.entries(typeGroups)) {
      const averageConfidence = data.totalConfidence / data.count
      if (averageConfidence > dominantType.confidence) {
        dominantType = {
          type: this.ensureValidContentType(type),
          confidence: averageConfidence,
          patterns: data.patterns,
          weight: 1.0,
          metadata: {
            domain: type,
            subDomain: 'general',
            classification: {
              type: type,
              purpose: 'auto-detected',
              audience: 'general'
            }
          },
          suggestedMetadata: {
            domain: type,
            subDomain: 'general',
            classification: {
              type: type,
              purpose: 'auto-detected',
              audience: 'general'
            }
          }
        }
      }
    }

    return dominantType
  }

  private generateSchema(
    contentTypeDef: ContentTypeDefinition,
    analyses: Array<{ content: string; analysis: ExtendedDetectionResult }>
  ): SchemaDefinition {
    return {
      type: contentTypeDef.id as BaseContentType,
      properties: {
        ...contentTypeDef.validation?.patterns?.reduce((props: Record<string, any>, pattern: DocumentPattern) => ({
          ...props,
          [pattern.name]: {
            type: 'string',
            pattern: pattern.pattern,
            required: pattern.required,
            examples: pattern.examples
          }
        }), {}),
        ...analyses.reduce((props: Record<string, any>, analysis) => ({
          ...props,
          ...analysis.analysis.metadata.properties
        }), {})
      },
      required: contentTypeDef.validation?.required || [],
      metadata: {
        category: contentTypeDef.metadata.category,
        confidence: analyses.reduce((sum, a) => sum + a.analysis.confidence, 0) / analyses.length,
        source: 'auto-generated',
        timestamp: new Date().toISOString()
      }
    }
  }

  private async generateHandlerConfig(
    contentTypeDef: ContentTypeDefinition,
    schema: SchemaDefinition,
    analyses: Array<{ content: string; analysis: ExtendedDetectionResult }>
  ): Promise<HandlerConfig> {
    const patterns = contentTypeDef.validation?.patterns || []
    const dominantType = this.determineDominantType(analyses.map(a => a.analysis))
    const industry = isValidContentType(dominantType.type) ? dominantType.type : DEFAULT_CONTENT_TYPE
    
    return {
      id: `${contentTypeDef.name.toLowerCase()}-${Date.now()}`,
      type: contentTypeDef.type,
      name: `${contentTypeDef.name}-Handler`,
      active: true,
      capabilities: [
        'content-detection',
        'metadata-extraction',
        'pattern-matching',
        ...analyses.flatMap(a => a.analysis.metadata.capabilities || [])
      ],
      config: {
        patterns: patterns.map(p => ({
          name: p.name,
          pattern: p.pattern,
          required: p.required || false,
          examples: p.examples || [],
          extractMetadata: p.extractMetadata || []
        })),
        metadata: schema.properties,
        settings: {
          matchThreshold: 0.8,
          contextWindow: 1000,
          maxTokens: 2000,
          dynamicResponses: true,
          includeLinks: true,
          includeContact: true,
          includeSteps: true,
          includePrice: true,
          includeAvailability: true,
          useExactMatches: false
        }
      },
      metadata: {
        generated: true,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        industry,
        category: contentTypeDef.metadata.category || 'default',
        confidence: dominantType.confidence,
        domain: dominantType.metadata.domain,
        subDomain: dominantType.metadata.subDomain
      }
    }
  }

  private async generateTemplateConfig(
    contentTypeDef: ContentTypeDefinition,
    schema: SchemaDefinition,
    analyses: Array<{ content: string; analysis: ExtendedDetectionResult }>
  ): Promise<TemplateConfig> {
    const patterns = contentTypeDef.validation?.patterns || []
    
    return {
      id: crypto.randomUUID(),
      name: `${contentTypeDef.name}-Template`,
      version: '1.0',
      structure: {
        patterns: patterns.map((p: DocumentPattern) => ({
          name: p.name,
          pattern: p.pattern,
          required: p.required,
          examples: p.examples,
          extractMetadata: p.extractMetadata
        })),
        sections: this.generateSections(contentTypeDef, analyses),
        metadata: schema.properties,
        extractors: patterns
          .filter((p: DocumentPattern) => p.extractMetadata && p.extractMetadata.length > 0)
          .map((p: DocumentPattern) => ({
            field: p.name,
            pattern: p.pattern,
            metadata: p.extractMetadata || []
          }))
      },
      handlerConfig: {
        responseTypes: this.determineResponseTypes(contentTypeDef),
        requiredMetadata: schema.required,
        customSettings: {
          useMarkdown: true,
          formatDates: true,
          includeMeta: true
        }
      }
    }
  }

  private generateSections(
    contentTypeDef: ContentTypeDefinition,
    analyses: Array<{ content: string; analysis: ExtendedDetectionResult }>
  ): any[] {
    // Basis-Sektionen basierend auf Content-Type
    const baseSections = [
      {
        id: 'header',
        type: 'header',
        required: true,
        fields: ['title', 'description']
      },
      {
        id: 'main',
        type: 'content',
        required: true,
        fields: ['content']
      }
    ]

    // Spezifische Sektionen je nach Content-Type
    switch (contentTypeDef.id) {
      case 'event':
        return [
          ...baseSections,
          {
            id: 'eventDetails',
            type: 'details',
            required: true,
            fields: ['date', 'time', 'location']
          }
        ]

      case 'tutorial':
        return [
          ...baseSections,
          {
            id: 'steps',
            type: 'steps',
            required: true,
            fields: ['steps']
          },
          {
            id: 'difficulty',
            type: 'info',
            required: false,
            fields: ['difficulty']
          }
        ]

      case 'download':
        return [
          ...baseSections,
          {
            id: 'downloadDetails',
            type: 'details',
            required: true,
            fields: ['url', 'fileType', 'fileSize']
          }
        ]

      default:
        return baseSections
    }
  }

  private determineResponseTypes(contentTypeDef: ContentTypeDefinition): ResponseContentType[] {
    // Basis-Response-Types
    const baseTypes: ResponseContentType[] = ['text' as ResponseContentType]

    // Spezifische Response-Types je nach Content-Type und Metadaten
    const additionalTypes: ResponseContentType[] = []

    // Füge strukturierte Antworten hinzu, wenn Patterns oder Validierung vorhanden
    if (contentTypeDef.validation?.patterns?.length || contentTypeDef.patterns?.length) {
      additionalTypes.push('structured' as ResponseContentType)
    }

    // Füge medienspezifische Antworten basierend auf dem Content-Type hinzu
    switch (contentTypeDef.type) {
      case BaseContentTypes.VIDEO:
        additionalTypes.push('video' as ResponseContentType, 'media' as ResponseContentType)
        break
      case BaseContentTypes.IMAGE:
        additionalTypes.push('image' as ResponseContentType, 'media' as ResponseContentType)
        break
      case BaseContentTypes.DOWNLOAD:
        additionalTypes.push('download' as ResponseContentType)
        break
      case BaseContentTypes.CONTACT:
        additionalTypes.push('card' as ResponseContentType)
        break
      case BaseContentTypes.FAQ:
        additionalTypes.push('list' as ResponseContentType)
        break
      case BaseContentTypes.FORM:
        additionalTypes.push('interactive' as ResponseContentType)
        break
      case BaseContentTypes.SERVICE:
      case BaseContentTypes.PRODUCT:
        additionalTypes.push('card' as ResponseContentType, 'structured' as ResponseContentType)
        break
    }

    // Füge Composite hinzu, wenn mehrere Typen vorhanden sind
    if (additionalTypes.length > 1) {
      additionalTypes.push('composite' as ResponseContentType)
    }

    return [...new Set([...baseTypes, ...additionalTypes])]
  }

  private async extractContent(file: File): Promise<string> {
    // TODO: Implementiere Textextraktion basierend auf Dateityp
    const buffer = await file.arrayBuffer()
    const text = new TextDecoder().decode(buffer)
    return text
  }

  private ensureValidContentType(type: string | undefined): ContentType {
    if (!type) return BaseContentTypes.DEFAULT as ContentType
    
    const normalizedType = type.toLowerCase() as BaseContentType
    
    // Prüfe ob der normalisierte Typ in BaseContentTypes existiert
    if (Object.values(BaseContentTypes).map(t => t.toLowerCase()).includes(normalizedType)) {
      return normalizedType as ContentType
    }
    
    return BaseContentTypes.DEFAULT as ContentType
  }

  public async analyzeContent(content: string): Promise<ExtendedDetectionResult> {
    try {
      const types = await this.registry.list()
      let bestMatch: ExtendedDetectionResult | null = null
      let highestConfidence = 0

      for (const type of types) {
        const result = await this.analyzeWithType(content, type)
        if (result && result.confidence > highestConfidence) {
          bestMatch = result
          highestConfidence = result.confidence
        }
      }

      return bestMatch || this.createDefaultResult()
    } catch (error) {
      console.error('Fehler bei der Dokumentanalyse:', error)
      return this.createDefaultResult()
    }
  }

  private createDefaultResult(): ExtendedDetectionResult {
    return {
      type: BaseContentTypes.DEFAULT,
      confidence: 0,
      patterns: [],
      weight: 0,
      metadata: {
        domain: '',
        subDomain: '',
        classification: {
          type: 'unknown',
          purpose: 'unknown',
          audience: 'general'
        }
      },
      suggestedMetadata: {}
    }
  }

  private async analyzeWithType(content: string, type: ContentTypeDefinition): Promise<ExtendedDetectionResult | null> {
    try {
      const matches = await this.findPatternMatches(content, type)
      const confidence = this.calculateConfidence(matches)
      
      const baseMetadata = {
        domain: '',
        subDomain: '',
        classification: {
          type: 'content',
          purpose: 'information',
          audience: 'general'
        }
      }

      return {
        type: type.type,
        confidence,
        patterns: matches,
        weight: 1.0,
        metadata: {
          ...baseMetadata,
          ...type.metadata
        },
        suggestedMetadata: {}
      }
    } catch (error) {
      console.error('Fehler bei der Analyse:', error)
      return null
    }
  }

  private async findPatternMatches(content: string, type: ContentTypeDefinition): Promise<Array<{ pattern: string, matches: string[] }>> {
    const matches: Array<{ pattern: string, matches: string[] }> = []
    
    if (type.patterns) {
      for (const pattern of type.patterns) {
        if (typeof pattern === 'string') {
          const regex = new RegExp(pattern, 'g')
          const found = content.match(regex)
          if (found) {
            matches.push({ pattern, matches: found })
          }
        } else if (pattern instanceof RegExp) {
          const found = content.match(pattern)
          if (found) {
            matches.push({ pattern: pattern.source, matches: found })
          }
        }
      }
    }
    
    return matches
  }

  private calculateConfidence(matches: Array<{ pattern: string, matches: string[] }>): number {
    return matches.length > 0 ? 1.0 : 0.0
  }
} 