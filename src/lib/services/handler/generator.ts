import { HandlerConfig, HandlerTemplateConfig } from '@/lib/types/handler'
import { prisma } from '@/lib/prisma'
import { generateId } from '@/lib/utils'
import { DocumentPattern } from '@/lib/types/common'

function convertToDocumentPattern(pattern: string): DocumentPattern {
  return {
    name: 'Generated Pattern',
    pattern,
    required: false,
    examples: [],
    extractMetadata: []
  }
}

export async function generateHandler(
  templateId: string,
  config: HandlerTemplateConfig
): Promise<HandlerConfig> {
  // Konvertiere Patterns in das richtige Format
  const documentPatterns = config.patterns.map(convertToDocumentPattern)
  
  // Erstelle die Metadaten-Map
  const metadataMap: Record<string, any> = {}
  config.metadataDefinitions.forEach(def => {
    metadataMap[def.name] = {
      ...def,
      required: config.requiredMetadata.includes(def.name)
    }
  })

  // Erstelle die Handler-Konfiguration
  const handlerConfig: HandlerConfig = {
    id: generateId(),
    type: config.type,
    name: config.name,
    active: true,
    capabilities: config.capabilities,
    config: {
      patterns: documentPatterns,
      metadata: metadataMap,
      settings: {
        matchThreshold: 0.8,
        contextWindow: 1000,
        maxTokens: 500,
        dynamicResponses: true,
        includeLinks: config.customSettings.includeMeta,
        includeContact: false,
        includeSteps: false,
        includePrice: false,
        includeAvailability: false,
        useExactMatches: false
      }
    },
    metadata: {
      generated: true,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      templateId
    }
  }

  // Konvertiere die Konfiguration für die Datenbank
  const dbConfig = JSON.stringify(handlerConfig.config)
  const dbMetadata = JSON.stringify(handlerConfig.metadata)

  // Speichere den Handler in der Datenbank
  await prisma.template_handlers.create({
    data: {
      id: handlerConfig.id,
      templateId,
      type: handlerConfig.type,
      name: handlerConfig.name,
      active: handlerConfig.active,
      metadata: dbMetadata,
      config: dbConfig,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })

  return handlerConfig
} 