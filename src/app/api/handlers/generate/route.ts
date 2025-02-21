import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateHandler } from '@/lib/services/handler/generator'
import type { ExtractionSchemaFields } from '@/lib/types/schema'
import { HandlerConfig, HandlerTemplateConfig } from '@/lib/types/handler'
import { ResponseType } from '@/lib/types/common'
import { BaseContentType, BaseContentTypes } from '@/lib/types/contentTypes'
import { HandlerGenerator } from '@/lib/services/document/HandlerGenerator'
import { DocumentProcessor } from '@/lib/services/document/DocumentProcessor'
import { MonitoringService } from '@/lib/monitoring/monitoring'
import { ProcessedDocument } from '@/lib/services/document/types'
import { ResponseContentTypes } from '@/lib/types/contentTypes'

const VALID_RESPONSE_TYPES: ResponseType[] = [
  ResponseContentTypes.TEXT,
  ResponseContentTypes.LIST,
  ResponseContentTypes.TABLE,
  ResponseContentTypes.CARD,
  ResponseContentTypes.LINK,
  ResponseContentTypes.DOWNLOAD,
  ResponseContentTypes.IMAGE,
  ResponseContentTypes.VIDEO,
  ResponseContentTypes.CUSTOM,
  ResponseContentTypes.WARNING,
  ResponseContentTypes.SUCCESS,
  ResponseContentTypes.STRUCTURED,
  ResponseContentTypes.MEDIA,
  ResponseContentTypes.INTERACTIVE,
  ResponseContentTypes.COMPOSITE
]

const REQUIRED_METADATA: Record<ResponseType, string[]> = {
  [ResponseContentTypes.TEXT]: ['content'],
  [ResponseContentTypes.LIST]: ['items'],
  [ResponseContentTypes.TABLE]: ['headers', 'rows'],
  [ResponseContentTypes.CARD]: ['title', 'content'],
  [ResponseContentTypes.LINK]: ['title', 'url'],
  [ResponseContentTypes.DOWNLOAD]: ['title', 'url'],
  [ResponseContentTypes.IMAGE]: ['url', 'altText'],
  [ResponseContentTypes.VIDEO]: ['title', 'url'],
  [ResponseContentTypes.CUSTOM]: ['content'],
  [ResponseContentTypes.WARNING]: ['message', 'type'],
  [ResponseContentTypes.SUCCESS]: ['message'],
  [ResponseContentTypes.STRUCTURED]: ['data', 'schema'],
  [ResponseContentTypes.MEDIA]: ['type', 'url', 'metadata'],
  [ResponseContentTypes.INTERACTIVE]: ['type', 'config', 'callbacks'],
  [ResponseContentTypes.COMPOSITE]: ['components', 'layout']
}

const REQUIRED_CAPABILITIES = [
  'text_extraction',
  'metadata_extraction',
  'pattern_matching'
]

const RESPONSE_TYPE_CAPABILITIES: Record<ResponseType, string[]> = {
  [ResponseContentTypes.TEXT]: ['text_response'],
  [ResponseContentTypes.LIST]: ['list_response', 'structured_response'],
  [ResponseContentTypes.TABLE]: ['table_response', 'structured_response'],
  [ResponseContentTypes.CARD]: ['card_response', 'structured_response'],
  [ResponseContentTypes.LINK]: ['link_response', 'redirect_response'],
  [ResponseContentTypes.DOWNLOAD]: ['download_response', 'file_response'],
  [ResponseContentTypes.IMAGE]: ['image_response', 'media_response'],
  [ResponseContentTypes.VIDEO]: ['media_response', 'embed_response'],
  [ResponseContentTypes.CUSTOM]: ['custom_response'],
  [ResponseContentTypes.WARNING]: ['warning_response', 'alert_response'],
  [ResponseContentTypes.SUCCESS]: ['success_response', 'confirmation_response'],
  [ResponseContentTypes.STRUCTURED]: ['structured_response', 'schema_response'],
  [ResponseContentTypes.MEDIA]: ['media_response', 'streaming_response'],
  [ResponseContentTypes.INTERACTIVE]: ['interactive_response', 'dynamic_response'],
  [ResponseContentTypes.COMPOSITE]: ['composite_response', 'multi_component_response']
}

function parseSchemaFields(rawFields: any): ExtractionSchemaFields {
  if (!rawFields || typeof rawFields !== 'object') {
    throw new Error('Ungültiges Schema-Format')
  }

  return {
    patterns: Array.isArray(rawFields.patterns) ? rawFields.patterns : [],
    metadata: Array.isArray(rawFields.metadata) ? rawFields.metadata : [],
    version: typeof rawFields.version === 'number' ? rawFields.version : 1,
    settings: typeof rawFields.settings === 'object' ? rawFields.settings : {},
    responseTypes: Array.isArray(rawFields.responseTypes) 
      ? rawFields.responseTypes.map((rt: any) => ({
          type: rt.type || BaseContentTypes.DEFAULT,
          schema: rt.schema || {},
          templates: Array.isArray(rt.templates) ? rt.templates : []
        }))
      : []
  }
}

function validateResponseTypes(config: HandlerTemplateConfig, schema: ExtractionSchemaFields): { 
  valid: boolean
  error?: string 
} {
  // Überprüfe, ob alle Response-Types gültig sind
  const invalidTypes = config.responseTypes.filter(
    type => !VALID_RESPONSE_TYPES.includes(type)
  )
  if (invalidTypes.length > 0) {
    return {
      valid: false,
      error: `Ungültige Response-Types: ${invalidTypes.join(', ')}`
    }
  }

  // Überprüfe, ob die Response-Types im Schema definiert sind
  const schemaTypes = new Set(schema.responseTypes.map(rt => rt.type))
  const unsupportedTypes = config.responseTypes.filter(
    type => !schemaTypes.has(type as BaseContentType)
  )
  if (unsupportedTypes.length > 0) {
    return {
      valid: false,
      error: `Response-Types nicht im Schema definiert: ${unsupportedTypes.join(', ')}`
    }
  }

  // Überprüfe, ob die erforderlichen Metadaten vorhanden sind
  for (const type of config.responseTypes) {
    const requiredFields = REQUIRED_METADATA[type]
    const missingFields = requiredFields.filter(
      field => !config.metadataDefinitions.some(def => def.name === field)
    )
    if (missingFields.length > 0) {
      return {
        valid: false,
        error: `Fehlende Metadaten für ${type}: ${missingFields.join(', ')}`
      }
    }

    // Überprüfe, ob die Response-Type-Templates vorhanden sind
    const typeSchema = schema.responseTypes.find(rt => rt.type === type)
    if (!typeSchema || !typeSchema.templates || typeSchema.templates.length === 0) {
      return {
        valid: false,
        error: `Keine Templates für Response-Type ${type} definiert`
      }
    }
  }

  return { valid: true }
}

function validatePatterns(patterns: string[]): { 
  valid: boolean
  error?: string 
} {
  // Überprüfe auf leere oder ungültige Patterns
  const invalidPatterns = patterns.filter(p => !p || p.length < 3)
  if (invalidPatterns.length > 0) {
    return {
      valid: false,
      error: 'Patterns müssen mindestens 3 Zeichen lang sein'
    }
  }

  // Überprüfe auf gültige Regex-Syntax
  try {
    patterns.forEach(p => new RegExp(p))
  } catch (error) {
    return {
      valid: false,
      error: 'Ungültige Regex-Syntax in Patterns'
    }
  }

  return { valid: true }
}

function validateCapabilities(
  config: HandlerTemplateConfig,
  schema: ExtractionSchemaFields
): {
  valid: boolean
  error?: string
} {
  // Überprüfe erforderliche Basis-Capabilities
  const missingRequired = REQUIRED_CAPABILITIES.filter(
    cap => !config.capabilities.includes(cap)
  )
  if (missingRequired.length > 0) {
    return {
      valid: false,
      error: `Fehlende erforderliche Capabilities: ${missingRequired.join(', ')}`
    }
  }

  // Überprüfe Response-Type-spezifische Capabilities
  for (const type of config.responseTypes) {
    const requiredCaps = RESPONSE_TYPE_CAPABILITIES[type] || []
    const missingCaps = requiredCaps.filter(
      cap => !config.capabilities.includes(cap)
    )
    if (missingCaps.length > 0) {
      return {
        valid: false,
        error: `Fehlende Capabilities für ${type}: ${missingCaps.join(', ')}`
      }
    }
  }

  // Überprüfe Schema-spezifische Capabilities
  const schemaCapabilities = new Set(
    schema.responseTypes.flatMap(rt => 
      RESPONSE_TYPE_CAPABILITIES[rt.type as ResponseType] || []
    )
  )
  const unsupportedCaps = config.capabilities.filter(
    cap => !schemaCapabilities.has(cap) && !REQUIRED_CAPABILITIES.includes(cap)
  )
  if (unsupportedCaps.length > 0) {
    return {
      valid: false,
      error: `Nicht unterstützte Capabilities: ${unsupportedCaps.join(', ')}`
    }
  }

  return { valid: true }
}

function validateTemplateCompatibility(
  config: HandlerTemplateConfig,
  schema: ExtractionSchemaFields
): {
  valid: boolean
  error?: string
} {
  // Überprüfe Pattern-Kompatibilität
  const schemaPatterns = new Set(schema.patterns.map(p => p.pattern))
  const unsupportedPatterns = config.patterns.filter(
    p => !schemaPatterns.has(p)
  )
  if (unsupportedPatterns.length > 0) {
    return {
      valid: false,
      error: 'Handler verwendet nicht definierte Patterns'
    }
  }

  // Überprüfe Metadaten-Kompatibilität
  const schemaMetadata = new Set(schema.metadata.map(m => m.name))
  const unsupportedMetadata = config.metadataDefinitions
    .filter(def => !schemaMetadata.has(def.name))
  if (unsupportedMetadata.length > 0) {
    return {
      valid: false,
      error: `Nicht definierte Metadaten: ${unsupportedMetadata.map(m => m.name).join(', ')}`
    }
  }

  // Überprüfe Template-Einstellungen
  if (config.customSettings.useTemplating && !schema.settings?.allowTemplating) {
    return {
      valid: false,
      error: 'Templating ist für dieses Schema nicht aktiviert'
    }
  }

  return { valid: true }
}

function validateHandlerConfig(
  config: HandlerTemplateConfig,
  schema?: ExtractionSchemaFields
): { 
  valid: boolean
  error?: string 
} {
  // Basis-Validierung
  if (!config.name || !config.type) {
    return { valid: false, error: 'Name und Typ sind erforderlich' }
  }
  if (!Array.isArray(config.capabilities)) {
    return { valid: false, error: 'Capabilities müssen ein Array sein' }
  }
  if (!config.validation || typeof config.validation !== 'object') {
    return { valid: false, error: 'Ungültige Validierungskonfiguration' }
  }
  if (!Array.isArray(config.responseTypes) || config.responseTypes.length === 0) {
    return { valid: false, error: 'Mindestens ein Response-Type ist erforderlich' }
  }
  if (!Array.isArray(config.requiredMetadata)) {
    return { valid: false, error: 'Required Metadata muss ein Array sein' }
  }
  if (!config.customSettings || typeof config.customSettings !== 'object') {
    return { valid: false, error: 'Ungültige Custom Settings' }
  }
  if (!Array.isArray(config.patterns)) {
    return { valid: false, error: 'Patterns müssen ein Array sein' }
  }
  if (!Array.isArray(config.metadataDefinitions)) {
    return { valid: false, error: 'Metadata Definitions müssen ein Array sein' }
  }

  // Pattern-Validierung
  const patternValidation = validatePatterns(config.patterns)
  if (!patternValidation.valid) {
    return patternValidation
  }

  if (schema) {
    // Response-Type-Validierung
    const responseTypeValidation = validateResponseTypes(config, schema)
    if (!responseTypeValidation.valid) {
      return responseTypeValidation
    }

    // Capability-Validierung
    const capabilityValidation = validateCapabilities(config, schema)
    if (!capabilityValidation.valid) {
      return capabilityValidation
    }

    // Template-Kompatibilität
    const compatibilityValidation = validateTemplateCompatibility(config, schema)
    if (!compatibilityValidation.valid) {
      return compatibilityValidation
    }
  }

  return { valid: true }
}

function generateHandlerConfig(
  template: { id: string; name?: string },
  fields: ExtractionSchemaFields
): HandlerTemplateConfig {
  // Bestimme die am besten geeigneten Response-Types basierend auf dem Schema
  const suggestedTypes = fields.responseTypes
    .filter(rt => rt.templates && rt.templates.length > 0)
    .map(rt => rt.type as ResponseType)
    .filter(type => VALID_RESPONSE_TYPES.includes(type))
    .sort((a, b) => {
      // Priorisiere Types mit mehr Templates und Metadaten
      const aSchema = fields.responseTypes.find(rt => rt.type === a)
      const bSchema = fields.responseTypes.find(rt => rt.type === b)
      const aScore = (aSchema?.templates?.length || 0) + Object.keys(aSchema?.schema || {}).length
      const bScore = (bSchema?.templates?.length || 0) + Object.keys(bSchema?.schema || {}).length
      return bScore - aScore
    })
    .slice(0, 3) // Maximal 3 Response-Types vorschlagen

  // Fallback, wenn keine passenden Types gefunden wurden
  const defaultTypes: ResponseType[] = [
    ResponseContentTypes.TEXT,
    ResponseContentTypes.STRUCTURED
  ]
  const responseTypes = suggestedTypes.length > 0 ? suggestedTypes : defaultTypes

  // Sammle alle erforderlichen Metadaten für die gewählten Response-Types
  const requiredMetadata = new Set<string>()
  responseTypes.forEach(type => {
    // Basis-Metadaten
    REQUIRED_METADATA[type].forEach(field => requiredMetadata.add(field))
    
    // Schema-spezifische Metadaten
    const typeSchema = fields.responseTypes.find(rt => rt.type === type)
    if (typeSchema?.schema) {
      Object.keys(typeSchema.schema).forEach(field => requiredMetadata.add(field))
    }
  })

  // Erstelle die Handler-Konfiguration
  const handlerConfig: HandlerTemplateConfig = {
    name: `Handler für ${template.name || template.id}`,
    description: 'Automatisch generierter Handler basierend auf dem Template-Schema',
    type: 'custom',
    capabilities: [
      'text_extraction',
      'metadata_extraction',
      'pattern_matching',
      ...responseTypes.flatMap(type => RESPONSE_TYPE_CAPABILITIES[type] || [])
    ],
    validation: {
      required: true,
      rules: fields.patterns
        .filter(p => p.required)
        .map(p => `pattern:${p.pattern}`)
    },
    responseTypes,
    requiredMetadata: Array.from(requiredMetadata),
    customSettings: {
      useMarkdown: fields.settings?.useMarkdown ?? false,
      formatDates: fields.settings?.formatDates ?? true,
      includeMeta: fields.settings?.includeMeta ?? true,
      useTemplating: fields.settings?.useTemplating ?? true
    },
    patterns: fields.patterns.map(p => p.pattern),
    metadataDefinitions: fields.metadata.map(def => ({
      name: def.name,
      type: def.type || 'string',
      required: requiredMetadata.has(def.name)
    }))
  }

  return handlerConfig
}

// Initialisiere MonitoringService mit korrekter Konfiguration
const monitoring = new MonitoringService({
  serviceName: 'handler-generator',
  serviceVersion: '1.0.0',
  labels: {
    environment: process.env.NODE_ENV || 'development'
  },
  collectDefaultMetrics: true
})

export async function POST(
  request: NextRequest,
  { params }: { params: { templateId: string, id: string } }
) {
  try {
    const { config } = await request.json()

    // Initialisiere Services
    const handlerGenerator = new HandlerGenerator(process.env.OPENAI_API_KEY || '')
    const documentProcessor = new DocumentProcessor(
      process.env.OPENAI_API_KEY || '',
      monitoring
    )

    // Hole Template-Informationen
    const template = await prisma.template.findUnique({
      where: { id: params.id },
      select: { content: true }
    })

    if (!template || !template.content) {
      return NextResponse.json(
        { error: 'Template nicht gefunden oder kein Content vorhanden' },
        { status: 404 }
      )
    }

    // Erstelle ProcessedDocument
    const processedDoc: ProcessedDocument = {
      content: template.content.toString(),
      metadata: {
        templateId: params.id,
        type: config.type,
        source: 'template'
      },
      structuredData: {
        sections: [],
        metadata: {}
      }
    }

    // Generiere Handler
    const handler = await handlerGenerator.generateHandler(processedDoc)

    // Speichere den generierten Handler
    const response = await fetch(`/api/templates/${params.id}/handlers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(handler)
    })

    if (!response.ok) {
      throw new Error('Fehler beim Speichern des Handlers')
    }

    return NextResponse.json(handler)
  } catch (error) {
    console.error('Fehler bei der Handler-Generierung:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const templateId = searchParams.get('templateId')

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID fehlt' },
        { status: 400 }
      )
    }

    // Lade das Template mit Schema
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      include: {
        extractionSchema: true
      }
    })

    if (!template || !template.extractionSchema) {
      return NextResponse.json(
        { error: 'Template oder Schema nicht gefunden' },
        { status: 404 }
      )
    }

    // Parse und validiere das Schema
    let fields: ExtractionSchemaFields
    try {
      fields = parseSchemaFields(template.extractionSchema.fields)
    } catch (error) {
      return NextResponse.json(
        { error: 'Ungültiges Schema-Format' },
        { status: 400 }
      )
    }

    // Generiere eine intelligente Vorschau der Handler-Konfiguration
    const handlerConfig = generateHandlerConfig(template, fields)

    return NextResponse.json(handlerConfig)
  } catch (error) {
    console.error('Fehler bei der Handler-Vorschau:', error)
    return NextResponse.json(
      { error: 'Fehler bei der Handler-Vorschau' },
      { status: 500 }
    )
  }
} 