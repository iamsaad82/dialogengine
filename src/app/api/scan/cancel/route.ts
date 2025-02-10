import { NextRequest, NextResponse } from 'next/server'
import { FirecrawlScanner } from '@/lib/services/firecrawl'

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json()
    const scanner = new FirecrawlScanner({
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      pineconeApiKey: process.env.PINECONE_API_KEY || '',
      firecrawlApiKey: process.env.FIRECRAWL_API_KEY || '',
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
      pineconeIndex: process.env.PINECONE_INDEX || '',
      pineconeHost: process.env.PINECONE_HOST
    })

    if (jobId) {
      // Einzelnen Scan abbrechen
      await scanner.cancelCrawl(jobId)
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { error: 'Job-ID ist erforderlich' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Fehler beim Abbrechen des Scans:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
} 