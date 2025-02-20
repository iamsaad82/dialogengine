import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    const template = await prisma.template.findUnique({
      where: { id: params.templateId },
      select: {
        meta: true
      }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template nicht gefunden' },
        { status: 404 }
      )
    }

    const meta = template.meta as { contentTypes?: any[] }
    return NextResponse.json({ contentTypes: meta.contentTypes || [] })
  } catch (error) {
    console.error('Fehler beim Abrufen der Content-Types:', error)
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Content-Types' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    const body = await request.json()
    const { contentType } = body

    if (!contentType || !contentType.type || !contentType.title) {
      return NextResponse.json(
        { error: 'Ungültige Content-Type-Daten' },
        { status: 400 }
      )
    }

    const template = await prisma.template.findUnique({
      where: { id: params.templateId },
      select: {
        meta: true
      }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template nicht gefunden' },
        { status: 404 }
      )
    }

    const meta = template.meta as { contentTypes?: any[] } || { contentTypes: [] }
    const existingTypes = meta.contentTypes || []
    
    // Prüfe auf Duplikate
    const isDuplicate = existingTypes.some(t => t.type === contentType.type)
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'Content-Type existiert bereits' },
        { status: 400 }
      )
    }

    // Füge neuen Content-Type hinzu
    const updatedTypes = [...existingTypes, contentType]
    
    await prisma.template.update({
      where: { id: params.templateId },
      data: {
        meta: {
          ...meta,
          contentTypes: updatedTypes
        }
      }
    })

    return NextResponse.json({ contentType })
  } catch (error) {
    console.error('Fehler beim Erstellen des Content-Types:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Content-Types' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    const body = await request.json()
    const { type, updates } = body

    if (!type || !updates) {
      return NextResponse.json(
        { error: 'Ungültige Update-Daten' },
        { status: 400 }
      )
    }

    const template = await prisma.template.findUnique({
      where: { id: params.templateId },
      select: {
        meta: true
      }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template nicht gefunden' },
        { status: 404 }
      )
    }

    const meta = template.meta as { contentTypes?: any[] } || { contentTypes: [] }
    const existingTypes = meta.contentTypes || []
    
    // Aktualisiere den Content-Type
    const updatedTypes = existingTypes.map(t => 
      t.type === type ? { ...t, ...updates } : t
    )
    
    await prisma.template.update({
      where: { id: params.templateId },
      data: {
        meta: {
          ...meta,
          contentTypes: updatedTypes
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Content-Types:', error)
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Content-Types' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    if (!type) {
      return NextResponse.json(
        { error: 'Content-Type nicht angegeben' },
        { status: 400 }
      )
    }

    const template = await prisma.template.findUnique({
      where: { id: params.templateId },
      select: {
        meta: true
      }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template nicht gefunden' },
        { status: 404 }
      )
    }

    const meta = template.meta as { contentTypes?: any[] } || { contentTypes: [] }
    const existingTypes = meta.contentTypes || []
    
    // Entferne den Content-Type
    const updatedTypes = existingTypes.filter(t => t.type !== type)
    
    await prisma.template.update({
      where: { id: params.templateId },
      data: {
        meta: {
          ...meta,
          contentTypes: updatedTypes
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fehler beim Löschen des Content-Types:', error)
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Content-Types' },
      { status: 500 }
    )
  }
} 