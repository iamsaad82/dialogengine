import { NextRequest, NextResponse } from 'next/server'
import { PineconeService } from '@/lib/services/pineconeService'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Template-Daten laden
    const template = await prisma.template.findUnique({
      where: { id: params.id }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template nicht gefunden' },
        { status: 404 }
      )
    }

    // Pinecone Service initialisieren
    const pineconeService = new PineconeService()
    
    // Alten Index löschen
    await pineconeService.deleteIndex(params.id)
    
    // Neuen Index erstellen
    await pineconeService.ensureIndexExists(params.id)
    
    // Index-Statistiken abrufen
    const stats = await pineconeService.getIndexStats(params.id)

    return NextResponse.json({
      status: 'success',
      message: 'Index erfolgreich neu aufgebaut',
      stats
    })
  } catch (error) {
    console.error('Fehler beim Neuaufbau des Index:', error)
    return NextResponse.json(
      { 
        error: 'Fehler beim Neuaufbau des Index',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    )
  }
} 