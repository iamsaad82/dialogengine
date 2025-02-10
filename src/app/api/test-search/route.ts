import { NextResponse } from 'next/server'
import { SmartSearch } from '@/lib/services/search/core/search'

export async function POST(request: Request) {
  try {
    const { query } = await request.json()
    
    const search = new SmartSearch({
      templateId: 'cm6x3ocgb0004ywzwmo65dr04',
      pineconeIndex: 'dialog-engine',
      pineconeHost: 'https://dialog-engine-cwkwcon.svc.gcp-europe-west4-de1d.pinecone.io'
    })

    // Führe normale Suche durch, aber mit Debug-Informationen
    const results = await search.search({
      query,
      history: [],
      templateId: 'cm6x3ocgb0004ywzwmo65dr04',
      debug: true
    })

    return NextResponse.json({
      success: true,
      query,
      results,
      debug: {
        vectorSearchTime: results.metadata?.vectorSearchTime,
        totalSearchTime: results.metadata?.totalSearchTime,
        matchedDocuments: results.metadata?.matchedDocuments
      }
    })

  } catch (error) {
    console.error('Test search error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 