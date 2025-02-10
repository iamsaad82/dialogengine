import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ParsedBot } from '@/lib/types/template'

export const runtime = 'nodejs'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const template = await prisma.template.findUnique({
      where: {
        id: params.id
      },
      select: {
        jsonBot: true
      }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template nicht gefunden' },
        { status: 404 }
      )
    }

    const bot = template.jsonBot ? JSON.parse(template.jsonBot) : null

    return NextResponse.json({ bot })
  } catch (error) {
    console.error('Error fetching bot:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { bot } = await request.json()

    const updatedTemplate = await prisma.template.update({
      where: {
        id: params.id
      },
      data: {
        jsonBot: JSON.stringify(bot),
        updatedAt: new Date()
      },
      select: {
        jsonBot: true
      }
    })

    // Parse die gespeicherten Bot-Daten
    const updatedBot = updatedTemplate.jsonBot ? JSON.parse(updatedTemplate.jsonBot) : null

    // Setze Cache-Control Header um Browser-Caching zu verhindern
    const headers = new Headers()
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    
    return NextResponse.json({ bot: updatedBot }, {
      headers,
      status: 200
    })
  } catch (error: any) {
    console.error('Error updating bot:', error)
    return NextResponse.json(
      { error: error.message || 'Fehler beim Aktualisieren der Bot-Konfiguration' },
      { status: 500 }
    )
  }
} 