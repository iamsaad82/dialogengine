import { NextRequest, NextResponse } from 'next/server'
import { SmartSearch } from '@/lib/services/search/core'
import { PineconeService } from '@/lib/services/pinecone'
import { prisma } from '@/lib/prisma'
import { SearchConfig } from '@/lib/services/search/types'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = performance.now()
  
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

    const { query, history } = await request.json()
    
    // Bot-Konfiguration aus dem Template laden
    const botConfig = template.jsonBot ? JSON.parse(template.jsonBot) : {}
    const smartSearchConfig = botConfig.smartSearch || {}
    
    // Pinecone Service initialisieren
    const pineconeService = new PineconeService()
    
    const indexName = pineconeService.getTemplateIndexName(params.id)
    
    console.log('Smart Search Query - Start', {
      templateId: params.id,
      indexName,
      environment: process.env.PINECONE_ENVIRONMENT
    })

    // SmartSearch Konfiguration erstellen
    const searchConfig: SearchConfig = {
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      pineconeApiKey: process.env.PINECONE_API_KEY || '',
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
      pineconeIndex: process.env.PINECONE_INDEX || '',
      templateId: params.id,
      language: 'de',
      temperature: smartSearchConfig.temperature || 0.7,
      maxTokens: smartSearchConfig.maxTokens || 500,
      redis: process.env.REDIS_URL ? {
        host: new URL(process.env.REDIS_URL).hostname,
        port: parseInt(new URL(process.env.REDIS_URL).port),
        password: new URL(process.env.REDIS_URL).password
      } : undefined,
      searchConfig: {
        maxResults: smartSearchConfig.maxResults || 5,
        minScore: smartSearchConfig.minScore || 0.7,
        useCache: smartSearchConfig.useCache !== false,
        timeout: smartSearchConfig.timeout || 3000
      },
      systemPrompt: smartSearchConfig.systemPrompt,
      userPrompt: smartSearchConfig.userPrompt,
      followupPrompt: smartSearchConfig.followupPrompt
    }

    // SmartSearch initialisieren
    const smartSearch = new SmartSearch(params.id, searchConfig)

    // Suche durchführen
    const response = await smartSearch.search({
      query,
      history,
      templateId: params.id,
      language: searchConfig.language,
      metadata: {
        template: {
          id: template.id,
          name: template.name,
          type: template.type
        }
      }
    })
    
    const endTime = performance.now()
    console.log(`Smart Search Backend-Verarbeitungszeit: ${Math.round(endTime - startTime)}ms`)
    
    return NextResponse.json(response)

  } catch (error) {
    console.error('Smart Search Backend-Fehler:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const template = await prisma.template.findUnique({
      where: { id: params.id }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template nicht gefunden' },
        { status: 404 }
      )
    }

    const pineconeService = new PineconeService()
    
    const indexName = pineconeService.getTemplateIndexName(params.id)

    // Prüfe Index-Status
    const indexStats = await pineconeService.getIndexStats(params.id)

    return NextResponse.json({
      status: 'ready',
      message: 'Smart Search ist aktiv und bereit für Anfragen.',
      template: {
        id: template.id,
        name: template.name,
        type: template.type
      },
      index: {
        name: indexName,
        stats: indexStats
      }
    })
  } catch (error) {
    console.error('Smart Search Status Fehler:', error)
    return NextResponse.json(
      { 
        error: 'Fehler beim Abrufen des Smart Search Status',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    )
  }
} 