import { NextRequest, NextResponse } from 'next/server'
import { SmartSearch } from '@/lib/services/search/core'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = performance.now()
  console.log('Smart Search Query - Start', {
    templateId: params.id,
    pineconeIndex: process.env.PINECONE_INDEX,
    pineconeEnv: process.env.PINECONE_ENVIRONMENT,
    pineconeHost: process.env.PINECONE_HOST
  })

  try {
    const { query, history } = await request.json()
    
    const smartSearch = new SmartSearch({
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      pineconeApiKey: process.env.PINECONE_API_KEY || '',
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
      pineconeIndex: process.env.PINECONE_INDEX || '',
      pineconeHost: process.env.PINECONE_HOST,
      redisUrl: process.env.REDIS_URL,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      templateId: params.id
    })

    const response = await smartSearch.search({
      query,
      history,
      templateId: params.id
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

export async function GET(request: NextRequest) {
  try {
    // Prüfe Pinecone-Verbindung
    const smartSearch = new SmartSearch({
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      pineconeApiKey: process.env.PINECONE_API_KEY || '',
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
      pineconeIndex: process.env.PINECONE_INDEX || '',
      pineconeHost: process.env.PINECONE_HOST,
      templateId: 'test'
    })

    const index = smartSearch.vectorizer.getPineconeIndex()
    const stats = await index.describeIndexStats()

    return NextResponse.json({
      status: 'ready',
      message: 'Smart Search ist aktiv und bereit für Anfragen.',
      indexStats: stats
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