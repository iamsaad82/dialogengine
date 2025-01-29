import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ParsedBot } from '@/lib/types/template'

export const runtime = 'nodejs'

export async function PUT(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    const bot: ParsedBot = await request.json()
    const templateId = params.templateId

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID ist erforderlich' },
        { status: 400 }
      )
    }

    const updatedTemplate = await prisma.template.update({
      where: {
        id: templateId
      },
      data: {
        jsonBot: JSON.stringify(bot),
        updatedAt: new Date()
      }
    })

    // Setze Cache-Control Header um Browser-Caching zu verhindern
    const headers = new Headers()
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    
    return NextResponse.json(updatedTemplate, {
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