import { NextRequest, NextResponse } from 'next/server'
import { FirecrawlScanner } from '@/lib/services/firecrawl'

export async function POST(request: NextRequest) {
  try {
    const { url, templateId } = await request.json()
    
    console.log('Scan-Anfrage erhalten:', { url, templateId })
    
    if (!url) {
      return NextResponse.json({ error: 'URL ist erforderlich' }, { status: 400 })
    }

    console.log('Initialisiere FirecrawlScanner...')
    const scanner = new FirecrawlScanner({
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      pineconeApiKey: process.env.PINECONE_API_KEY || '',
      firecrawlApiKey: process.env.FIRECRAWL_API_KEY || '',
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
      pineconeIndex: process.env.PINECONE_INDEX || '',
      pineconeHost: process.env.PINECONE_HOST
    })
    
    console.log('Starte Scan...')
    const jobId = await scanner.startCrawl(url, templateId)
    console.log('Scan gestartet mit Job-ID:', jobId)

    return NextResponse.json({ jobId, status: 'started' })
  } catch (error) {
    console.error('Fehler beim Starten des Scans:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
} 