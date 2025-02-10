import { NextRequest, NextResponse } from 'next/server'
import { SmartSearch } from '@/lib/services/search/core'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; action: string } }
) {
  try {
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

    const { feedback, sessionId } = await request.json()

    switch (params.action) {
      case 'feedback':
        await smartSearch.handleFeedback(feedback, sessionId)
        return NextResponse.json({ success: true })
      
      default:
        return NextResponse.json(
          { error: 'Unbekannte Aktion' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Smart Search Action-Fehler:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      status: 'ready',
      message: 'Smart Search Actions sind aktiv und bereit für Anfragen.'
    })
  } catch (error) {
    console.error('Smart Search Action Status Fehler:', error)
    return NextResponse.json(
      { error: 'Fehler beim Abrufen des Smart Search Action Status' },
      { status: 500 }
    )
  }
} 