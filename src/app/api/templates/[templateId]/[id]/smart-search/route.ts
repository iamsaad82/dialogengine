import { NextRequest, NextResponse } from 'next/server'
import { SmartSearchHandler } from '@/lib/services/search/handlers/specialized/smart-search'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { query } = await request.json()
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query ist erforderlich' },
        { status: 400 }
      )
    }

    // Initialisiere SmartSearch mit der Template-ID aus den Parametern
    const smartSearch = new SmartSearchHandler({
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      pineconeApiKey: process.env.PINECONE_API_KEY || '',
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
      pineconeIndex: process.env.PINECONE_INDEX || '',
      templateId: params.id
    })

    // Suche relevante Inhalte und generiere eine Antwort
    const response = await smartSearch.handle({ query, type: 'info' })
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Smart Search Fehler:', error)
    return NextResponse.json(
      { error: 'Fehler bei der Verarbeitung der Anfrage' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'GET-Methode wird nicht unterstützt' },
    { status: 405 }
  )
} 