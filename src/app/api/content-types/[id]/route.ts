import { NextResponse } from 'next/server'
import { ContentTypeRegistry } from '@/lib/types/contentTypes'

// Initialisiere Registry
const registry: ContentTypeRegistry = {
  register: (definition) => {},
  get: (id) => undefined,
  list: () => [],
  update: (id, definition) => {},
  remove: (id) => {},
  validateContent: async (content, typeId) => false
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const type = registry.get(params.id)
    if (!type) {
      return NextResponse.json(
        { error: 'Content-Type nicht gefunden' },
        { status: 404 }
      )
    }
    return NextResponse.json(type)
  } catch (error) {
    console.error('Fehler beim Laden des Content-Types:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden des Content-Types' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    registry.remove(params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fehler beim Löschen des Content-Types:', error)
    return NextResponse.json(
      { error: 'Fehler beim Löschen des Content-Types' },
      { status: 500 }
    )
  }
} 