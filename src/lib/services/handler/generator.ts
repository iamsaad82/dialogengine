import { HandlerConfig, HandlerTemplateConfig, DocumentPattern, MetadataDefinition } from '@/lib/types/template'
import { nanoid } from 'nanoid'

export class HandlerGenerator {
  /**
   * Generiert einen neuen Handler basierend auf der Template-Konfiguration
   */
  static generateHandler(
    templateId: string,
    config: HandlerTemplateConfig,
    patterns: DocumentPattern[],
    metadata: MetadataDefinition[]
  ): HandlerConfig {
    const id = nanoid()
    const name = `Generated Handler ${id.slice(0, 6)}`

    // Basis-Konfiguration
    const handlerConfig: HandlerConfig = {
      id,
      type: 'template',
      name,
      active: true,
      capabilities: this.generateCapabilities(config, patterns),
      config: {
        patterns: this.processPatterns(patterns),
        metadata: this.processMetadata(metadata),
        settings: {
          matchThreshold: 0.7,
          contextWindow: 1000,
          maxTokens: 500,
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
        version: '1.0',
        templateId
      }
    }

    return handlerConfig
  }

  /**
   * Generiert die Capabilities basierend auf der Konfiguration
   */
  private static generateCapabilities(
    config: HandlerTemplateConfig,
    patterns: DocumentPattern[]
  ): string[] {
    const capabilities: string[] = []

    // Response-Type Capabilities
    const responseTypes = Array.isArray(config?.responseTypes) ? config.responseTypes : []
    responseTypes.forEach(type => {
      capabilities.push(`response:${type}`)
    })

    // Pattern-basierte Capabilities
    const safePatterns = Array.isArray(patterns) ? patterns : []
    safePatterns.forEach(pattern => {
      if (pattern && Array.isArray(pattern.extractMetadata) && pattern.extractMetadata.length > 0) {
        capabilities.push(`extract:${pattern.name}`)
      }
    })

    // Metadata-basierte Capabilities
    const requiredMetadata = Array.isArray(config?.requiredMetadata) ? config.requiredMetadata : []
    requiredMetadata.forEach(field => {
      capabilities.push(`metadata:${field}`)
    })

    return capabilities
  }

  /**
   * Verarbeitet die Dokumentmuster für den Handler
   */
  private static processPatterns(patterns: DocumentPattern[]): any {
    return patterns.map(pattern => ({
      name: pattern.name,
      pattern: pattern.pattern,
      required: pattern.required,
      extractors: pattern.extractMetadata || []
    }))
  }

  /**
   * Verarbeitet die Metadaten-Definitionen für den Handler
   */
  private static processMetadata(metadata: MetadataDefinition[]): any {
    if (!Array.isArray(metadata)) {
      return {}
    }

    return metadata.reduce((acc, field) => {
      if (field && typeof field === 'object' && 'name' in field) {
        acc[field.name] = {
          type: field.type || 'string',
          required: field.required || false,
          pattern: field.pattern,
          defaultValue: field.defaultValue
        }
      }
      return acc
    }, {} as Record<string, any>)
  }
} 