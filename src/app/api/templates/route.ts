import { NextResponse } from 'next/server'
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '@/lib/prisma'

export const runtime = 'edge'

export async function GET() {
  try {
    const templates = await getTemplates()
    return NextResponse.json(templates)
  } catch (error) {
    console.error('GET error:', error)
    return NextResponse.json({ error: "Fehler beim Laden der Templates" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const template = await createTemplate(data)
    return NextResponse.json(template)
  } catch (error) {
    console.error('POST error:', error)
    return NextResponse.json({ error: "Fehler beim Erstellen des Templates" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const data = await req.json()
    const { id } = data
    const template = await updateTemplate(id, data)
    return NextResponse.json(template)
  } catch (error) {
    console.error('PUT error:', error)
    return NextResponse.json({ error: "Fehler beim Aktualisieren des Templates" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: "ID ist erforderlich" }, { status: 400 })
    }
    await deleteTemplate(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE error:', error)
    return NextResponse.json({ error: "Fehler beim Löschen des Templates" }, { status: 500 })
  }
} 