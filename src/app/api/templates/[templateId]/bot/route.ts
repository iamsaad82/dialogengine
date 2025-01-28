import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ParsedBot } from '@/lib/schemas/template'

export async function PUT(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    const bot: ParsedBot = await request.json()
    const templateId = params.templateId

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
  } catch (error) {
    console.error('Error updating bot:', error)
    return NextResponse.json(
      { error: 'Failed to update bot configuration' },
      { status: 500 }
    )
  }
} 