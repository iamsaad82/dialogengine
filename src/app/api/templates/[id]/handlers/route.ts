import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { HandlerConfig, BotConfig } from '@/lib/types/template'
import { ContentTypeEnum } from '@/lib/types/contentTypes'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const template = await prisma.template.findUnique({
      where: { id: params.id },
      select: { jsonBot: true }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template nicht gefunden' },
        { status: 404 }
      )
    }

    const botConfig: BotConfig = template.jsonBot 
      ? JSON.parse(template.jsonBot.toString()) 
      : { 
          type: 'aok-handler',
          aokHandler: {
            pineconeApiKey: process.env.PINECONE_API_KEY || '',
            pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
            pineconeIndex: process.env.PINECONE_INDEX || '',
            openaiApiKey: process.env.OPENAI_API_KEY || ''
          },
          handlers: {}
        }

    // Hole Handler für das Template
    const handlers = botConfig.handlers?.[params.id] || []

    // Wenn keine Handler existieren und es ein AOK-Template ist,
    // erstelle einen Standard-Handler
    if (handlers.length === 0 && botConfig.type === 'aok-handler') {
      handlers.push({
        type: 'info',
        active: true,
        metadata: {
          keyTopics: [],
          entities: [],
          facts: []
        },
        responses: [],
        settings: {
          matchThreshold: 0.7,
          contextWindow: 3,
          maxTokens: 150,
          dynamicResponses: true,
          includeLinks: true,
          pineconeConfig: {
            environment: process.env.PINECONE_ENVIRONMENT || '',
            index: process.env.PINECONE_INDEX || ''
          }
        }
      })
    }

    return NextResponse.json({ handlers })
  } catch (error) {
    console.error('Fehler beim Laden der Handler:', error)
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

    const template = await prisma.template.findUnique({
      where: { id: params.id },
      select: { jsonBot: true }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template nicht gefunden' },
        { status: 404 }
      )
    }

    const botConfig: BotConfig = template.jsonBot 
      ? JSON.parse(template.jsonBot.toString())
      : { 
          type: 'aok-handler',
          aokHandler: {
            pineconeApiKey: process.env.PINECONE_API_KEY || '',
            pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
            pineconeIndex: process.env.PINECONE_INDEX || '',
            openaiApiKey: process.env.OPENAI_API_KEY || ''
          },
          handlers: {}
        }

    // Initialisiere handlers-Array für das Template, falls es noch nicht existiert
    if (!botConfig.handlers) {
      botConfig.handlers = {}
    }
    if (!botConfig.handlers[params.id]) {
      botConfig.handlers[params.id] = []
    }

    // Aktualisiere oder füge Handler hinzu
    const handlerIndex = botConfig.handlers[params.id].findIndex(
      h => h.type === handler.type
    )

    if (handlerIndex >= 0) {
      botConfig.handlers[params.id][handlerIndex] = handler
    } else {
      botConfig.handlers[params.id].push(handler)
    }

    // Speichere aktualisierte Konfiguration
    await prisma.template.update({
      where: { id: params.id },
      data: {
        jsonBot: JSON.stringify(botConfig)
      }
    })

    return NextResponse.json({ success: true })
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

    const template = await prisma.template.findUnique({
      where: { id: params.id },
      select: { jsonBot: true }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template nicht gefunden' },
        { status: 404 }
      )
    }

    const botConfig: BotConfig = template.jsonBot 
      ? JSON.parse(template.jsonBot.toString())
      : { 
          type: 'aok-handler',
          aokHandler: {
            pineconeApiKey: process.env.PINECONE_API_KEY || '',
            pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
            pineconeIndex: process.env.PINECONE_INDEX || '',
            openaiApiKey: process.env.OPENAI_API_KEY || ''
          },
          handlers: {}
        }

    // Stelle sicher, dass handlers existiert
    if (!botConfig.handlers) {
      botConfig.handlers = {}
    }

    // Filtere den zu löschenden Handler heraus
    if (botConfig.handlers[params.id]) {
      botConfig.handlers[params.id] = botConfig.handlers[params.id].filter(
        h => h.type !== handlerType
      )
    }

    // Speichere aktualisierte Konfiguration
    await prisma.template.update({
      where: { id: params.id },
      data: {
        jsonBot: JSON.stringify(botConfig)
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