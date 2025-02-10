import { NextRequest, NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
})

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!process.env.PINECONE_INDEX) {
      throw new Error('PINECONE_INDEX ist nicht konfiguriert')
    }

    const index = pinecone.index(process.env.PINECONE_INDEX)
    
    // Lösche den Vektor mit der angegebenen ID
    await index.deleteOne(params.id)
    
    return NextResponse.json({ 
      success: true,
      message: 'Dokument wurde erfolgreich gelöscht'
    })
  } catch (error) {
    console.error('Fehler beim Löschen des Dokuments:', error)
    return NextResponse.json(
      { 
        error: 'Fehler beim Löschen des Dokuments',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    )
  }
} 