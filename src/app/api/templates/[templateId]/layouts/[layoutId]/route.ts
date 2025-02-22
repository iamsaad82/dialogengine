import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: Request,
  { params }: { params: { templateId: string; layoutId: string } }
) {
  try {
    const body = await request.json()
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

    const meta = template.meta as { layouts?: any[] }
    const layouts = meta.layouts || []
    const layoutIndex = layouts.findIndex(l => l.id === params.layoutId)

    if (layoutIndex === -1) {
      return NextResponse.json(
        { error: 'Layout nicht gefunden' },
        { status: 404 }
      )
    }

    // Aktualisiere das Layout
    const updatedLayout = {
      ...layouts[layoutIndex],
      ...body,
      id: params.layoutId, // Stelle sicher, dass die ID nicht geändert wird
      metadata: {
        ...layouts[layoutIndex].metadata,
        ...body.metadata,
        lastModified: new Date().toISOString()
      }
    }

    layouts[layoutIndex] = updatedLayout

    // Speichere die Änderungen
    await prisma.template.update({
      where: { id: params.templateId },
      data: {
        meta: {
          ...template.meta,
          layouts
        }
      }
    })

    return NextResponse.json(updatedLayout)
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Layouts:', error)
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Layouts' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { templateId: string; layoutId: string } }
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

    const meta = template.meta as { layouts?: any[] }
    const layouts = meta.layouts || []
    const layoutIndex = layouts.findIndex(l => l.id === params.layoutId)

    if (layoutIndex === -1) {
      return NextResponse.json(
        { error: 'Layout nicht gefunden' },
        { status: 404 }
      )
    }

    // Entferne das Layout
    layouts.splice(layoutIndex, 1)

    // Speichere die Änderungen
    await prisma.template.update({
      where: { id: params.templateId },
      data: {
        meta: {
          ...template.meta,
          layouts
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fehler beim Löschen des Layouts:', error)
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Layouts' },
      { status: 500 }
    )
  }
} 