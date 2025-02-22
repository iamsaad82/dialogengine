import { NextResponse } from 'next/server'
import { SchemaService } from '@/lib/services/schema/schema-service'
import type { ExtractionSchema } from '@/lib/types/schema'

const schemaService = new SchemaService()

export async function GET(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    const schemas = await schemaService.getSchemasByTemplate(params.templateId)
    return NextResponse.json(schemas)
  } catch (error) {
    console.error('Fehler beim Laden der Schemas:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Schemas' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    const schema = await request.json() as ExtractionSchema
    schema.templateId = params.templateId

    // Validiere das Schema
    const validationResult = await schemaService.validateSchema(schema)
    if (!validationResult.isValid) {
      return NextResponse.json(
        { error: 'Ungültiges Schema', details: validationResult.errors },
        { status: 400 }
      )
    }

    // Speichere das Schema
    const savedSchema = await schemaService.saveSchema(schema)
    return NextResponse.json(savedSchema)
  } catch (error) {
    console.error('Fehler beim Speichern des Schemas:', error)
    return NextResponse.json(
      { error: 'Fehler beim Speichern des Schemas' },
      { status: 500 }
    )
  }
} 