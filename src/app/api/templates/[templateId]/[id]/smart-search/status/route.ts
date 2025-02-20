import { NextRequest, NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'
import { OpenAI } from 'openai'

export async function GET(request: NextRequest) {
  const startTime = performance.now()
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('query') || ''
  
  try {
    // OpenAI für Embedding
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    // Pinecone initialisieren
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || ''
    })

    const indexName = process.env.PINECONE_INDEX || 'dialog-engine'
    const index = pinecone.index(indexName)
    
    // Basis-Statistiken
    const describeStartTime = performance.now()
    const stats = await index.describeIndexStats()
    const describeTime = performance.now() - describeStartTime

    let queryResponse
    let queryTime = 0
    let embedding

    // Wenn eine Suchanfrage vorhanden ist
    if (query) {
      // Embedding erstellen
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: query
      })
      embedding = embeddingResponse.data[0].embedding

      // Pinecone durchsuchen
      const queryStartTime = performance.now()
      queryResponse = await index.query({
        vector: embedding,
        topK: 5,
        includeMetadata: true
      })
      queryTime = performance.now() - queryStartTime
    }

    const totalTime = performance.now() - startTime

    return NextResponse.json({
      status: 'ready',
      message: 'Pinecone ist aktiv und erreichbar',
      environment: process.env.NODE_ENV,
      performance: {
        total: Math.round(totalTime),
        describe: Math.round(describeTime),
        query: Math.round(queryTime)
      },
      stats,
      indexName,
      serverless: true,
      query: query || undefined,
      results: queryResponse?.matches?.map(match => ({
        score: match.score,
        metadata: match.metadata
      }))
    })
  } catch (error) {
    console.error('Pinecone Status Check Fehler:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
    const errorDetails = {
      status: 'error',
      message: 'Fehler bei der Pinecone-Verbindung',
      error: errorMessage,
      environment: process.env.NODE_ENV,
      indexName: process.env.PINECONE_INDEX,
      query: query || undefined,
      configPresent: {
        apiKey: !!process.env.PINECONE_API_KEY,
        environment: !!process.env.PINECONE_ENVIRONMENT,
        index: !!process.env.PINECONE_INDEX
      }
    }

    return NextResponse.json(errorDetails, { status: 500 })
  }
} 