import { NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'

export async function POST() {
  try {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    })

    const indexName = process.env.PINECONE_INDEX || 'dialog-engine'
    const index = pinecone.index(indexName)

    // Lösche alle Vektoren
    await index.deleteAll()
    
    return NextResponse.json({
      message: 'Alle gespeicherten Seiten wurden gelöscht'
    })
  } catch (error) {
    console.error('Fehler beim Löschen der Seiten:', error)
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Seiten' },
      { status: 500 }
    )
  }
} 