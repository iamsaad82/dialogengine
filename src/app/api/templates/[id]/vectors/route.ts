import { NextRequest, NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!process.env.PINECONE_INDEX) {
      throw new Error('PINECONE_INDEX ist nicht konfiguriert')
    }

    console.log('Lösche Vektoren für Template:', params.id)
    
    const pinecone = new Pinecone()
    const index = pinecone.index(process.env.PINECONE_INDEX)

    // Lösche alle Vektoren mit der Template-ID
    await index.deleteMany({
      filter: {
        templateId: { $eq: params.id }
      }
    })

    return NextResponse.json({ 
      success: true,
      message: 'Alle Vektoren wurden erfolgreich gelöscht'
    })
  } catch (error) {
    console.error('Fehler beim Löschen der Vektoren:', error)
    return NextResponse.json(
      { 
        error: 'Fehler beim Löschen der Vektoren',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    )
  }
} 