import { NextRequest, NextResponse } from 'next/server'
import { FirecrawlScanner } from '@/lib/services/firecrawl'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!
const PINECONE_API_KEY = process.env.PINECONE_API_KEY!
const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT
const PINECONE_HOST = process.env.PINECONE_HOST
const PINECONE_INDEX = process.env.PINECONE_INDEX
const REDIS_URL = process.env.REDIS_URL
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY!

if (!FIRECRAWL_API_KEY) {
  throw new Error('FIRECRAWL_API_KEY Umgebungsvariable fehlt')
}

export async function POST(request: NextRequest) {
  try {
    const { url, templateId } = await request.json()
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL ist erforderlich' },
        { status: 400 }
      )
    }

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template-ID ist erforderlich' },
        { status: 400 }
      )
    }

    const scanner = new FirecrawlScanner({
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      pineconeApiKey: process.env.PINECONE_API_KEY || '',
      firecrawlApiKey: process.env.FIRECRAWL_API_KEY || '',
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
      pineconeIndex: process.env.PINECONE_INDEX || '',
      pineconeHost: process.env.PINECONE_HOST
    })

    const jobId = await scanner.startCrawl(url, templateId)

    return NextResponse.json({ jobId, status: 'started' })
  } catch (error) {
    console.error('Fehler beim Starten des Scans:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
} 