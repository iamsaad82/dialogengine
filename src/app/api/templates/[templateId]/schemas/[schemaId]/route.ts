import { NextResponse } from 'next/server'
import { SchemaService } from '@/lib/services/schema/schema-service'
import type { ExtractionSchema } from '@/lib/types/schema'

const schemaService = new SchemaService()

export async function PUT(
  request: Request,
  { params }: { params: { templateId: string; schemaId: string } }
) {
  try {
    const schema = await request.json() as ExtractionSchema
    schema.id = params.schemaId
    schema.templateId = params.templateId

    // Validiere das Schema
    const validationResult = await schemaService.validateSchema(schema)
    if (!validationResult.isValid) {
      return NextResponse.json(
        { error: 'Ungültiges Schema', details: validationResult.errors },
        { status: 400 }
      )
    }

    // Aktualisiere das Schema
    const updatedSchema = await schemaService.saveSchema(schema)
    return NextResponse.json(updatedSchema)
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Schemas:', error)
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Schemas' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { templateId: string; schemaId: string } }
) {
  try {
    // Prüfe ob das Schema existiert und zum Template gehört
    const schema = await schemaService.getSchema(params.schemaId)
    if (!schema || schema.templateId !== params.templateId) {
      return NextResponse.json(
        { error: 'Schema nicht gefunden' },
        { status: 404 }
      )
    }

    // Lösche das Schema
    await schemaService.deleteSchema(params.schemaId)
    
    return NextResponse.json({ 
      success: true,
      message: 'Schema erfolgreich gelöscht'
    })
  } catch (error) {
    console.error('Fehler beim Löschen des Schemas:', error)
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Schemas' },
      { status: 500 }
    )
  }
} 