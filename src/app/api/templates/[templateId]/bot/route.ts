import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    const data = await request.json()
    
    // Validiere die Eingabedaten
    if (!data.type || !data.config) {
      return NextResponse.json(
        { error: 'Ungültige Bot-Konfiguration' },
        { status: 400 }
      )
    }

    // Aktualisiere das Template
    const template = await prisma.template.update({
      where: { id: params.templateId },
      data: {
        bot_type: data.type,
        bot_config: data.config
      }
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Bot-Konfiguration:', error)
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Bot-Konfiguration' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    const template = await prisma.template.findUnique({
      where: { id: params.templateId },
      select: {
        bot_type: true,
        bot_config: true
      }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template nicht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      type: template.bot_type,
      config: template.bot_config
    })
  } catch (error) {
    console.error('Fehler beim Laden der Bot-Konfiguration:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Bot-Konfiguration' },
      { status: 500 }
    )
  }
} 