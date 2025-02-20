import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const template = await prisma.template.findUnique({
      where: { id: params.id },
      select: { jsonMeta: true }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template nicht gefunden' },
        { status: 404 }
      )
    }

    const metadata = template.jsonMeta ? JSON.parse(template.jsonMeta) : null

    return NextResponse.json({ metadata })
  } catch (error) {
    console.error('Fehler beim Laden der Metadaten:', error)
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
    const { metadata } = await request.json()

    const template = await prisma.template.update({
      where: { id: params.id },
      data: {
        jsonMeta: JSON.stringify(metadata)
      },
      select: { jsonMeta: true }
    })

    if (!template.jsonMeta) {
      return NextResponse.json(
        { error: 'Fehler beim Speichern der Metadaten' },
        { status: 500 }
      )
    }

    const parsedMetadata = JSON.parse(template.jsonMeta)
    return NextResponse.json({ metadata: parsedMetadata })
  } catch (error) {
    console.error('Fehler beim Speichern der Metadaten:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}