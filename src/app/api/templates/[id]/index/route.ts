import { NextResponse } from 'next/server'
import { PineconeService } from '@/lib/services/pineconeService'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

const pineconeService = new PineconeService()

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const templateId = params.id
    if (!templateId) {
      return new NextResponse('Template ID fehlt', { status: 400 })
    }

    // Hole die Template-Konfiguration
    const template = await prisma.template.findUnique({
      where: { id: templateId }
    })

    if (!template) {
      return new NextResponse('Template nicht gefunden', { status: 404 })
    }

    // Parse die Bot-Konfiguration
    const botConfig = template.jsonBot ? JSON.parse(template.jsonBot) : {}
    const indexName = `dialog-engine-${templateId}`

    // Erstelle den Index mit den Standard-Parametern für text-embedding-ada-002
    await pineconeService.ensureIndexExists(
      indexName,
      1536, // Dimension für text-embedding-ada-002
      'cosine'
    )
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fehler beim Erstellen des Template-Index:', error)
    return new NextResponse('Interner Server-Fehler', { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const templateId = params.id
    if (!templateId) {
      return new NextResponse('Template ID fehlt', { status: 400 })
    }

    const indexName = `dialog-engine-${templateId}`
    const stats = await pineconeService.getIndexStats(indexName)
    
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Fehler beim Abrufen der Index-Statistiken:', error)
    return new NextResponse('Interner Server-Fehler', { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const templateId = params.id
    if (!templateId) {
      return new NextResponse('Template ID fehlt', { status: 400 })
    }

    const indexName = `dialog-engine-${templateId}`
    await pineconeService.deleteIndex(indexName)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fehler beim Löschen des Template-Index:', error)
    return new NextResponse('Interner Server-Fehler', { status: 500 })
  }
} 