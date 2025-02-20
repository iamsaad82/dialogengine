import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const handlers = await prisma.template_handlers.findMany({
      select: {
        id: true,
        type: true,
        name: true,
        active: true,
        metadata: true,
        config: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json(handlers)
  } catch (error) {
    console.error('Fehler beim Laden der Handler:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Handler' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const now = new Date()
    const handler = await prisma.template_handlers.create({
      data: {
        id: data.id,
        templateId: data.templateId,
        type: data.type,
        name: data.name,
        active: data.active,
        metadata: data.metadata,
        config: data.config,
        updatedAt: now
      }
    })

    return NextResponse.json(handler)
  } catch (error) {
    console.error('Fehler beim Erstellen des Handlers:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Handlers' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json()
    const now = new Date()
    const handler = await prisma.template_handlers.update({
      where: { id: data.id },
      data: {
        type: data.type,
        name: data.name,
        active: data.active,
        metadata: data.metadata,
        config: data.config,
        updatedAt: now
      }
    })

    return NextResponse.json(handler)
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Handlers:', error)
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Handlers' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Handler ID fehlt' },
        { status: 400 }
      )
    }

    await prisma.template_handlers.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fehler beim Löschen des Handlers:', error)
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Handlers' },
      { status: 500 }
    )
  }
} 