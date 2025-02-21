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

export async function GET() {
  try {
    const types = registry.list()
    return NextResponse.json(types)
  } catch (error) {
    console.error('Fehler beim Laden der Content-Types:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Content-Types' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    registry.register(data)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fehler beim Erstellen des Content-Types:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen des Content-Types' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json()
    registry.update(data.id, data)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Content-Types:', error)
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Content-Types' },
      { status: 500 }
    )
  }
} 