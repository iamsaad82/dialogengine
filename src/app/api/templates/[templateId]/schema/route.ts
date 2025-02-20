import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    const data = await request.json()
    
    // Validiere die Eingabedaten
    if (!data.name || !data.fields) {
      return NextResponse.json(
        { error: 'Ungültige Schema-Daten' },
        { status: 400 }
      )
    }

    // Erstelle oder aktualisiere das Schema
    const schema = await prisma.extractionSchema.upsert({
      where: {
        templateId: params.templateId
      },
      create: {
        templateId: params.templateId,
        name: data.name,
        description: data.description,
        fields: data.fields,
        version: data.fields.version || 1
      },
      update: {
        name: data.name,
        description: data.description,
        fields: data.fields,
        version: data.fields.version || 1
      }
    })

    return NextResponse.json(schema)
  } catch (error) {
    console.error('Fehler beim Erstellen des Schemas:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Schemas' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    const schema = await prisma.extractionSchema.findUnique({
      where: {
        templateId: params.templateId
      }
    })

    if (!schema) {
      return NextResponse.json(
        { error: 'Schema nicht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json(schema)
  } catch (error) {
    console.error('Fehler beim Laden des Schemas:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden des Schemas' },
      { status: 500 }
    )
  }
} 