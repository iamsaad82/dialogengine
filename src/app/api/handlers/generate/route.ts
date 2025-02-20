import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { HandlerGenerator } from '@/lib/services/handler/generator'
import type { ExtractionSchemaFields } from '@/lib/types/schema'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { templateId, config, patterns, metadata } = data

    // Validiere die Eingabedaten
    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID fehlt' },
        { status: 400 }
      )
    }

    // Stelle sicher, dass die Arrays initialisiert sind
    const safeConfig = {
      responseTypes: Array.isArray(config?.responseTypes) ? config.responseTypes : [],
      requiredMetadata: Array.isArray(config?.requiredMetadata) ? config.requiredMetadata : [],
      customSettings: config?.customSettings || {}
    }

    const safePatterns = Array.isArray(patterns) ? patterns : []
    const safeMetadata = Array.isArray(metadata) ? metadata : []

    // Generiere den Handler
    const handlerConfig = HandlerGenerator.generateHandler(
      templateId,
      safeConfig,
      safePatterns,
      safeMetadata
    )

    // Speichere den Handler in der Datenbank
    const handler = await prisma.template_handlers.create({
      data: {
        id: handlerConfig.id,
        templateId,
        type: handlerConfig.type,
        name: handlerConfig.name,
        active: handlerConfig.active,
        metadata: handlerConfig.metadata,
        config: handlerConfig.config,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(handler)
  } catch (error) {
    console.error('Fehler bei der Handler-Generierung:', error)
    return NextResponse.json(
      { error: 'Fehler bei der Handler-Generierung' },
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

    // Sichere Konvertierung der JSON-Felder
    const rawFields = template.extractionSchema.fields as Record<string, any>
    const fields: ExtractionSchemaFields = {
      patterns: Array.isArray(rawFields.patterns) ? rawFields.patterns : [],
      metadata: Array.isArray(rawFields.metadata) ? rawFields.metadata : [],
      version: typeof rawFields.version === 'number' ? rawFields.version : 1,
      settings: typeof rawFields.settings === 'object' ? rawFields.settings : {},
      responseTypes: Array.isArray(rawFields.responseTypes) ? rawFields.responseTypes : []
    }

    // Generiere den Handler basierend auf dem Schema
    const handlerConfig = HandlerGenerator.generateHandler(
      templateId,
      {
        responseTypes: ['info', 'link', 'download'],
        requiredMetadata: ['title', 'description'],
        customSettings: {}
      },
      fields.patterns,
      fields.metadata
    )

    return NextResponse.json(handlerConfig)
  } catch (error) {
    console.error('Fehler bei der Handler-Vorschau:', error)
    return NextResponse.json(
      { error: 'Fehler bei der Handler-Vorschau' },
      { status: 500 }
    )
  }
} 