import { NextRequest, NextResponse } from 'next/server'
import { FirecrawlScanner } from '@/lib/services/firecrawl'

export async function POST(request: NextRequest) {
  try {
    const scanner = new FirecrawlScanner({
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      pineconeApiKey: process.env.PINECONE_API_KEY || '',
      firecrawlApiKey: process.env.FIRECRAWL_API_KEY || '',
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
      pineconeIndex: process.env.PINECONE_INDEX || '',
      pineconeHost: process.env.PINECONE_HOST
    })

    // Schließe die Scanner-Ressourcen
    await scanner.close()
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fehler beim Aufräumen der Scanner-Ressourcen:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
} 