import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

interface HandlerResponse {
  type: string
  templates?: string[]
  facts?: string[]
}

interface HandlerMetadata {
  keyTopics: string[]
  entities?: string[]
  facts?: string[]
}

interface Handler {
  type: string
  active: boolean
  metadata?: HandlerMetadata
  responses: HandlerResponse[]
}

// Handler-Schema Definition
const handlerSchema = z.object({
  type: z.string(),
  active: z.boolean(),
  metadata: z.object({
    keyTopics: z.array(z.string()),
    entities: z.array(z.string()).optional(),
    facts: z.array(z.string()).optional()
  }).optional(),
  responses: z.array(z.object({
    type: z.string(),
    templates: z.array(z.string()).optional(),
    facts: z.array(z.string()).optional()
  }))
})

// Schema-Definition
const extractionSchemaSchema = z.object({
  name: z.string(),
  description: z.string(),
  fields: z.array(z.any()),
  handlers: z.array(handlerSchema)
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Lade sowohl Schema als auch Template
    const [schema, template] = await Promise.all([
      prisma.extractionSchema.findUnique({
        where: {
          templateId: params.id
        }
      }),
      prisma.template.findUnique({
        where: {
          id: params.id
        },
        select: {
          jsonBot: true
        }
      })
    ])

    // Parse die Handler aus dem Template
    let handlers = []
    if (template?.jsonBot) {
      try {
        const jsonBot = JSON.parse(template.jsonBot)
        // Hole nur die Handler für dieses spezifische Template
        handlers = jsonBot.handlers?.[params.id] || []
      } catch (e) {
        console.error('Fehler beim Parsen der Handler:', e)
      }
    }

    if (!schema) {
      // Wenn kein Schema existiert, erstelle ein leeres Standard-Schema
      const defaultSchema = {
        name: 'Neues Schema',
        description: 'Beschreibung hier einfügen',
        fields: [],
        handlers: handlers // Füge die Template-spezifischen Handler hinzu
      }

      return NextResponse.json({ schema: defaultSchema })
    }

    // Füge die Template-spezifischen Handler zum existierenden Schema hinzu
    return NextResponse.json({ 
      schema: {
        ...schema,
        handlers: handlers
      }
    })
  } catch (error) {
    console.error('Fehler beim Laden des Schemas:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    console.log('Schema Update Request:', {
      templateId: params.id,
      schemaBody: body
    })
    
    // Validiere das Schema
    try {
      extractionSchemaSchema.parse(body.schema)
    } catch (validationError) {
      console.error('Schema Validation Error:', validationError)
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Ungültiges Schema-Format',
            details: validationError.errors 
          },
          { status: 400 }
        )
      }
      throw validationError
    }

    // Extrahiere die Handler aus dem Schema
    const { handlers, ...schemaWithoutHandlers } = body.schema

    // Aktualisiere das Template mit den Handlern
    if (handlers) {
      const template = await prisma.template.findUnique({
        where: { id: params.id },
        select: { jsonBot: true }
      })

      if (!template) {
        console.error('Template nicht gefunden:', params.id)
        throw new Error('Template nicht gefunden')
      }

      let existingConfig = { handlers: {} }
      try {
        existingConfig = template.jsonBot ? JSON.parse(template.jsonBot) : { handlers: {} }
      } catch (e) {
        console.error('Fehler beim Parsen des jsonBot:', e)
      }

      // Aktualisiere die Handler-Konfiguration
      const updatedConfig = {
        ...existingConfig,
        handlers: {
          ...existingConfig.handlers,
          [params.id]: handlers.map((handler: Handler) => ({
            ...handler,
            active: handler.active ?? true
          }))
        }
      }

      await prisma.template.update({
        where: { id: params.id },
        data: {
          jsonBot: JSON.stringify(updatedConfig)
        }
      })
    }

    // Aktualisiere oder erstelle das Schema
    const schema = await prisma.extractionSchema.upsert({
      where: {
        templateId: params.id
      },
      update: {
        ...schemaWithoutHandlers,
        updatedAt: new Date()
      },
      create: {
        templateId: params.id,
        ...schemaWithoutHandlers,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ 
      schema: {
        ...schema,
        handlers
      }
    })
  } catch (error) {
    console.error('Fehler beim Speichern des Schemas:', error)
    return NextResponse.json(
      { 
        error: 'Interner Serverfehler',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    )
  }
} 