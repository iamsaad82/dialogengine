import { NextRequest, NextResponse } from 'next/server'
import { FirecrawlScanner } from '@/lib/services/firecrawl'

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId')
  
  if (!jobId) {
    return NextResponse.json(
      { error: 'Job-ID ist erforderlich' },
      { status: 400 }
    )
  }

  try {
    const scanner = new FirecrawlScanner({
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      pineconeApiKey: process.env.PINECONE_API_KEY || '',
      firecrawlApiKey: process.env.FIRECRAWL_API_KEY || '',
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
      pineconeIndex: process.env.PINECONE_INDEX || '',
      pineconeHost: process.env.PINECONE_HOST
    })

    const status = await scanner.checkStatus(jobId)

    if (!status) {
      return NextResponse.json(
        { error: 'Job nicht gefunden' },
        { status: 404 }
      )
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error('Fehler beim Abrufen des Job-Status:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
} 