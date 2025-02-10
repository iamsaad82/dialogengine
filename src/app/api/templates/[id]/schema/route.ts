import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractionSchemaSchema } from '@/lib/schemas/template'
import { z } from 'zod'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const schema = await prisma.extractionSchema.findUnique({
      where: {
        templateId: params.id
      }
    })

    if (!schema) {
      // Wenn kein Schema existiert, erstelle ein leeres Standard-Schema
      const defaultSchema = {
        name: 'Neues Schema',
        description: 'Beschreibung hier einfügen',
        fields: []
      }

      return NextResponse.json({ schema: defaultSchema })
    }

    return NextResponse.json({ schema })
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
    
    // Validiere das Schema
    try {
      extractionSchemaSchema.parse(body.schema)
    } catch (validationError) {
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

    // Aktualisiere oder erstelle das Schema
    const schema = await prisma.extractionSchema.upsert({
      where: {
        templateId: params.id
      },
      update: {
        name: body.schema.name,
        description: body.schema.description,
        version: body.schema.version,
        fields: body.schema.fields,
        updatedAt: new Date()
      },
      create: {
        templateId: params.id,
        name: body.schema.name,
        description: body.schema.description,
        version: 1,
        fields: body.schema.fields,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ schema })
  } catch (error) {
    console.error('Fehler beim Speichern des Schemas:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
} 