import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { HandlerConfig } from '@/lib/types/handler'
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
      let metadata = {};
      
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

export async function POST(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const handler = await request.json()
    console.log('📝 Erstelle neuen Handler:', handler);

    // Prüfe ob die Daten bereits ein Objekt sind
    const configData: HandlerConfigData = {
      capabilities: handler.capabilities || [],
      patterns: handler.config?.patterns || [],
      metadata: handler.config?.metadata || {},
      settings: handler.config?.settings || {
        matchThreshold: 0.8,
        contextWindow: 1000,
        maxTokens: 2000,
        dynamicResponses: true
      }
    };

    const metadataData = handler.metadata || {};

    // Erstelle Handler in template_handlers
    const newHandler = await prisma.template_handlers.create({
      data: {
        id: nanoid(),
        templateId: params.templateId,
        type: handler.type,
        name: handler.name,
        active: handler.active ?? true,
        config: JSON.stringify(configData),
        metadata: JSON.stringify(metadataData)
      }
    })

    console.log('✅ Handler erstellt:', newHandler);

    return NextResponse.json(newHandler)
  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Handlers:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const url = new URL(request.url)
    const handlerId = url.searchParams.get('id')

    if (!handlerId) {
      return NextResponse.json(
        { error: 'Handler-ID nicht angegeben' },
        { status: 400 }
      )
    }

    console.log('🗑️ Lösche Handler:', { handlerId, templateId: params.templateId });

    // Lösche Handler aus template_handlers
    await prisma.template_handlers.delete({
      where: {
        id: handlerId,
        templateId: params.templateId
      }
    })

    console.log('✅ Handler gelöscht');

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Fehler beim Löschen des Handlers:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 