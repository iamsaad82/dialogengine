import { NextRequest, NextResponse } from 'next/server'
import { PineconeService } from '@/lib/services/pineconeService'
import { PineconeConfig } from '@/lib/types/config'
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

    const { config } = await request.json() as { config: PineconeConfig }
    
    // Pinecone Service initialisieren
    const pineconeService = new PineconeService()
    
    // Template-Index initialisieren
    await pineconeService.initializeTemplateIndex(params.id, {
      dimension: config.dimension || 1536,
      metric: config.metric || 'cosine',
      cloud: config.cloud || 'gcp',
      region: config.region || 'europe-west4'
    })

    // Index-Statistiken abrufen
    const stats = await pineconeService.getTemplateIndexStats(params.id)

    return NextResponse.json({
      status: 'success',
      message: 'Index erfolgreich initialisiert',
      stats
    })
  } catch (error) {
    console.error('Fehler bei der Index-Initialisierung:', error)
    return NextResponse.json(
      { 
        error: 'Fehler bei der Index-Initialisierung',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    )
  }
} 