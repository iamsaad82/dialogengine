import { NextRequest, NextResponse } from 'next/server'
import { HandlerGenerator } from '@/lib/services/document/HandlerGenerator'
import { DocumentProcessor } from '@/lib/services/document/DocumentProcessor'
import { MonitoringService } from '@/lib/monitoring/monitoring'
import { prisma } from '@/lib/prisma'
import { ProcessedDocument } from '@/lib/services/document/types'

// Initialisiere MonitoringService mit korrekter Konfiguration
const monitoring = new MonitoringService({
  serviceName: 'handler-generator',
  serviceVersion: '1.0.0',
  labels: {
    environment: process.env.NODE_ENV || 'development'
  },
  collectDefaultMetrics: true
})

export async function POST(
  request: NextRequest,
  { params }: { params: { templateId: string, id: string } }
) {
  try {
    const { config } = await request.json()

    // Initialisiere Services
    const handlerGenerator = new HandlerGenerator(process.env.OPENAI_API_KEY || '')
    const documentProcessor = new DocumentProcessor(
      process.env.OPENAI_API_KEY || '',
      monitoring
    )

    // Hole Template-Informationen
    const template = await prisma.template.findUnique({
      where: { id: params.id },
      select: { content: true }
    })

    if (!template || !template.content) {
      return NextResponse.json(
        { error: 'Template nicht gefunden oder kein Content vorhanden' },
        { status: 404 }
      )
    }

    // Erstelle ProcessedDocument
    const processedDoc: ProcessedDocument = {
      content: template.content.toString(),
      metadata: {
        templateId: params.id,
        type: config.type,
        source: 'template'
      },
      structuredData: {
        sections: [],
        metadata: {}
      }
    }

    // Generiere Handler
    const handler = await handlerGenerator.generateHandler(processedDoc)

    // Speichere den generierten Handler
    const response = await fetch(`/api/templates/${params.id}/handlers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(handler)
    })

    if (!response.ok) {
      throw new Error('Fehler beim Speichern des Handlers')
    }

    return NextResponse.json(handler)
  } catch (error) {
    console.error('Fehler bei der Handler-Generierung:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 