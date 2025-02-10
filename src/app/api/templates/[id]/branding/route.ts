import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ParsedBranding } from '@/lib/types/template'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const template = await prisma.template.findUnique({
      where: { id: params.id },
      select: { jsonBranding: true }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template nicht gefunden' },
        { status: 404 }
      )
    }

    const branding = template.jsonBranding ? JSON.parse(template.jsonBranding) : null

    return NextResponse.json({ branding })
  } catch (error) {
    console.error('Fehler beim Laden der Branding-Daten:', error)
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
    const { branding } = await request.json()

    const template = await prisma.template.update({
      where: { id: params.id },
      data: {
        jsonBranding: JSON.stringify(branding)
      },
      select: { jsonBranding: true }
    })

    if (!template.jsonBranding) {
      return NextResponse.json(
        { error: 'Fehler beim Speichern der Branding-Daten' },
        { status: 500 }
      )
    }

    return NextResponse.json({ branding: JSON.parse(template.jsonBranding) })
  } catch (error) {
    console.error('Fehler beim Speichern der Branding-Daten:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
} 