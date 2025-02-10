import { NextRequest, NextResponse } from 'next/server'
import { ContentVectorizer } from '@/lib/services/vectorizer'

export async function PUT(request: NextRequest) {
  try {
    const { contentId, type } = await request.json()

    if (!contentId || !type) {
      return NextResponse.json(
        { error: 'Content ID und Type sind erforderlich' },
        { status: 400 }
      )
    }

    const vectorizer = new ContentVectorizer({
      openaiApiKey: process.env.OPENAI_API_KEY!,
      pineconeApiKey: process.env.PINECONE_API_KEY!,
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || 'europe-west4',
      pineconeHost: process.env.PINECONE_HOST || '',
      pineconeIndex: process.env.PINECONE_INDEX || 'dialog-engine'
    })

    await vectorizer.updateContentType(contentId, type)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Content-Types:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
} 