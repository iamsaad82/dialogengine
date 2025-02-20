import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    const template = await prisma.template.findUnique({
      where: { id: params.templateId }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template nicht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Fehler beim Laden des Templates:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden des Templates' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    const data = await request.json()

    // Validiere die Daten
    if (!data) {
      return NextResponse.json(
        { error: 'Keine Daten erhalten' },
        { status: 400 }
      )
    }

    // Aktualisiere das Template
    const template = await prisma.template.update({
      where: { id: params.templateId },
      data: {
        content: data.content,
        branding: data.branding,
        meta: data.meta,
        config: data.config,
        handlers: data.handlers,
        responses: data.responses,
        updatedAt: new Date()
      }
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Templates:', error)
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Templates' },
      { status: 500 }
    )
  }
} 