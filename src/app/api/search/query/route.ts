import { NextRequest, NextResponse } from 'next/server'
import { ContentVectorizer } from '@/lib/services/vectorizer'

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 10 } = await request.json()

    if (!query) {
      return NextResponse.json(
        { error: 'Suchbegriff ist erforderlich' },
        { status: 400 }
      )
    }

    const vectorizer = new ContentVectorizer({
      openaiApiKey: process.env.OPENAI_API_KEY!,
      pineconeApiKey: process.env.PINECONE_API_KEY!,
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT!,
      pineconeHost: process.env.PINECONE_HOST!,
      pineconeIndex: process.env.PINECONE_INDEX!,
      templateId: 'default'
    })

    const results = await vectorizer.searchSimilar(query, limit)
    
    return NextResponse.json({
      query,
      resultsCount: results.length,
      results: results.map(r => ({
        url: r.metadata.url,
        title: r.metadata.title,
        text: r.text,
        score: r.score
      }))
    })
  } catch (error) {
    console.error('Fehler bei der Suche:', error)
    return NextResponse.json(
      { error: 'Fehler bei der Suche' },
      { status: 500 }
    )
  }
} 