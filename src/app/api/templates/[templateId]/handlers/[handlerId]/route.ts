import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: Request,
  { params }: { params: { templateId: string; handlerId: string } }
) {
  try {
    const { templateId, handlerId } = params

    // Prüfe ob der Handler existiert und zum Template gehört
    const handler = await prisma.template_handlers.findFirst({
      where: {
        id: handlerId,
        templateId: templateId
      }
    })

    if (!handler) {
      return NextResponse.json(
        { error: 'Handler nicht gefunden' },
        { status: 404 }
      )
    }

    // Lösche den Handler
    await prisma.template_handlers.delete({
      where: {
        id: handlerId
      }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Handler erfolgreich gelöscht'
    })
  } catch (error) {
    console.error('Fehler beim Löschen des Handlers:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 