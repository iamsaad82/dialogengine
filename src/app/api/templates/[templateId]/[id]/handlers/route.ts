import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { HandlerConfig } from '@/lib/types/template'
import { nanoid } from 'nanoid'

interface HandlerConfigData {
  capabilities?: string[]
  patterns?: Array<{
    name: string
    pattern: string
    required: boolean
    examples: string[]
    extractMetadata?: string[]
  }>
  metadata?: Record<string, any>
  settings?: {
    matchThreshold: number
    contextWindow: number
    maxTokens: number
    dynamicResponses: boolean
    includeLinks?: boolean
    includeContact?: boolean
    includeSteps?: boolean
    includePrice?: boolean
    includeAvailability?: boolean
    useExactMatches?: boolean
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    console.log('🔍 Lade Handler für Template:', params.templateId);

    // Hole Handler aus template_handlers
    const handlers = await prisma.template_handlers.findMany({
      where: { templateId: params.templateId }
    })

    console.log('📊 Gefundene Handler:', handlers.length);
    console.log('📝 Handler-Details:', handlers);

    // Konvertiere zu HandlerConfig-Format
    const handlerConfigs = handlers.map(h => {
      console.log('🔄 Verarbeite Handler:', h.id);
      
      let config: HandlerConfigData = {};
      let metadata: Record<string, any> = {};
      
      try {
        // Prüfe ob die Daten bereits ein Objekt sind
        config = typeof h.config === 'string' ? JSON.parse(h.config) : h.config;
        metadata = typeof h.metadata === 'string' ? JSON.parse(h.metadata) : h.metadata;
      } catch (parseError) {
        console.error('❌ Fehler beim Parsen der Handler-Daten:', {
          handlerId: h.id,
          error: parseError,
          config: h.config,
          metadata: h.metadata
        });
      }

      const defaultSettings = {
        matchThreshold: 0.8,
        contextWindow: 1000,
        maxTokens: 2000,
        dynamicResponses: true
      };

      return {
        id: h.id,
        type: h.type,
        name: h.name,
        active: h.active,
        capabilities: config.capabilities || [],
        config: {
          patterns: config.patterns || [],
          metadata: config.metadata || {},
          settings: config.settings || defaultSettings
        },
        metadata
      };
    });

    console.log('✅ Konvertierte Handler:', handlerConfigs);

    return NextResponse.json(handlerConfigs)
  } catch (error) {
    console.error('❌ Fehler beim Laden der Handler:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { handler } = await request.json()

    // Aktualisiere oder erstelle Handler in template_handlers
    const updatedHandler = await prisma.template_handlers.upsert({
      where: {
        id: handler.id || nanoid()
      },
      update: {
        name: handler.name,
        active: handler.active,
        config: JSON.stringify(handler.config),
        metadata: JSON.stringify(handler.metadata)
      },
      create: {
        id: handler.id || nanoid(),
        templateId: params.id,
        type: handler.type,
        name: handler.name,
        active: handler.active,
        config: JSON.stringify(handler.config),
        metadata: JSON.stringify(handler.metadata)
      }
    })

    return NextResponse.json({ success: true, handler: updatedHandler })
  } catch (error) {
    console.error('Fehler beim Speichern des Handlers:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const url = new URL(request.url)
    const handlerType = url.searchParams.get('type')

    if (!handlerType) {
      return NextResponse.json(
        { error: 'Handler-Typ nicht angegeben' },
        { status: 400 }
      )
    }

    // Lösche Handler aus template_handlers
    await prisma.template_handlers.deleteMany({
      where: {
        templateId: params.id,
        type: handlerType
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fehler beim Löschen des Handlers:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 