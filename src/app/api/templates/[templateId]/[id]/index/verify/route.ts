import { NextResponse } from 'next/server'
import { PineconeService } from '@/lib/services/pineconeService'
import { getServerSession } from 'next-auth'

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

    const body = await request.json()
    const { config } = body

    if (!config.indexName) {
      return new NextResponse('Index Name ist erforderlich', { status: 400 })
    }

    try {
      // Versuche die Index-Statistiken abzurufen
      const stats = await pineconeService.getIndexStats(config.indexName)

      return NextResponse.json({
        success: true,
        stats
      })
    } catch (error) {
      console.error('Fehler bei der Pinecone-Verbindung:', error)
      return new NextResponse('Index nicht gefunden oder nicht zugänglich', { status: 404 })
    }
  } catch (error) {
    console.error('Fehler bei der Verbindungsüberprüfung:', error)
    return new NextResponse('Interner Server-Fehler', { status: 500 })
  }
} 