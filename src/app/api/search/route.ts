import { NextRequest, NextResponse } from 'next/server'
import { SmartSearchHandler } from '@/lib/services/search/handlers/specialized/smart-search'

const searchHandler = new SmartSearchHandler({
  openaiApiKey: process.env.OPENAI_API_KEY!,
  pineconeApiKey: process.env.PINECONE_API_KEY!,
  pineconeEnvironment: process.env.PINECONE_ENVIRONMENT!,
  pineconeIndex: process.env.PINECONE_INDEX!,
  redisUrl: process.env.REDIS_URL,
  temperature: 0.7,
  maxTokens: 500,
  templateId: process.env.DEFAULT_TEMPLATE_ID!
})

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Ungültige Anfrage: Query fehlt oder ist kein String' },
        { status: 400 }
      )
    }

    const response = await searchHandler.handle({ query, type: 'info' })
    return NextResponse.json(response)
  } catch (error) {
    console.error('Fehler bei der Suche:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
} 