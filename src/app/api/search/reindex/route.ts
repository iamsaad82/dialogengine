import { NextRequest, NextResponse } from 'next/server'
import { FirecrawlScanner } from '@/lib/services/firecrawl'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const { templateId } = await request.json()

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template-ID ist erforderlich' },
        { status: 400 }
      )
    }

    const scanner = new FirecrawlScanner({
      openaiApiKey: process.env.OPENAI_API_KEY!,
      pineconeApiKey: process.env.PINECONE_API_KEY!,
      firecrawlApiKey: process.env.FIRECRAWL_API_KEY!,
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT!,
      pineconeIndex: process.env.PINECONE_INDEX!,
      pineconeHost: process.env.PINECONE_HOST!
    })
    
    // Generiere eine neue Job-ID
    const jobId = uuidv4()
    
    // Starte den Reindexierungs-Job
    await scanner.startCrawl(templateId, jobId)
    
    return NextResponse.json({
      jobId,
      message: 'Reindexierung gestartet'
    })
  } catch (error) {
    console.error('Fehler beim Starten der Reindexierung:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
} 