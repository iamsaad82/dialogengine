import { NextResponse } from 'next/server'
import { ContentVectorizer } from '@/lib/services/vectorizer'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const templateId = url.searchParams.get('templateId')

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template-ID ist erforderlich' },
        { status: 400 }
      )
    }

    console.log('Suche Dokumente für Template:', templateId)

    const vectorizer = new ContentVectorizer({
      openaiApiKey: process.env.OPENAI_API_KEY!,
      pineconeApiKey: process.env.PINECONE_API_KEY!,
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT!,
      pineconeHost: process.env.PINECONE_HOST!,
      pineconeIndex: process.env.PINECONE_INDEX!
    })

    // Hole alle Dokumente für dieses Template
    const results = await vectorizer.getAllDocuments(templateId)
    
    console.log('Gefundene Dokumente:', {
      count: results.length,
      templateId,
      urls: results.map(r => r.metadata.url)
    })

    return NextResponse.json({
      message: 'Dokumente erfolgreich geladen',
      resultsCount: results.length,
      results: results.map(r => ({
        url: r.metadata.url,
        title: r.metadata.title,
        text: r.text,
        metadata: r.metadata,
        score: r.score
      }))
    })
  } catch (error) {
    console.error('Fehler beim Laden der Dokumente:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Dokumente' },
      { status: 500 }
    )
  }
} 