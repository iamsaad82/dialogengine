import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { contentSchema } from '@/lib/schemas/template'
import { ZodError } from 'zod'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const template = await prisma.template.findUnique({
      where: {
        id: params.id
      },
      select: {
        jsonContent: true
      }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template nicht gefunden' },
        { status: 404 }
      )
    }

    const content = template.jsonContent ? JSON.parse(template.jsonContent) : null
    return NextResponse.json({ content })
  } catch (error) {
    console.error('Fehler beim Laden der Inhalte:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { content } = await request.json()
    
    if (!content) {
      return NextResponse.json(
        { error: 'Content fehlt im Request' },
        { status: 400 }
      )
    }

    try {
      contentSchema.parse(content)
    } catch (validationError) {
      if (validationError instanceof ZodError) {
        console.error('Validierungsfehler:', validationError.errors)
        return NextResponse.json(
          { 
            error: 'Ungültiges Content-Format',
            details: validationError.errors 
          },
          { status: 400 }
        )
      }
      throw validationError
    }

    const template = await prisma.template.update({
      where: {
        id: params.id
      },
      data: {
        jsonContent: JSON.stringify(content),
        updatedAt: new Date()
      },
      select: {
        jsonContent: true
      }
    })

    if (!template.jsonContent) {
      return NextResponse.json(
        { error: 'Fehler beim Speichern der Inhalte' },
        { status: 500 }
      )
    }

    const parsedContent = JSON.parse(template.jsonContent)
    return NextResponse.json({ content: parsedContent })
  } catch (error) {
    console.error('Fehler beim Speichern der Inhalte:', error)
    
    if (error instanceof ZodError) {
      return NextResponse.json(
        { 
          error: 'Validierungsfehler',
          details: error.errors 
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Interner Serverfehler beim Speichern' },
      { status: 500 }
    )
  }
} 