import { NextRequest, NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
  controllerHostUrl: `https://controller.${process.env.PINECONE_ENVIRONMENT}.pinecone.io`
})

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Starte Löschvorgang für Template:', params.id)
    
    if (!process.env.PINECONE_INDEX) {
      throw new Error('PINECONE_INDEX ist nicht konfiguriert')
    }

    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY ist nicht konfiguriert')
    }

    if (!process.env.PINECONE_ENVIRONMENT) {
      throw new Error('PINECONE_ENVIRONMENT ist nicht konfiguriert')
    }

    console.log('Umgebungsvariablen geprüft')

    const index = pinecone.index(process.env.PINECONE_INDEX)
    console.log('Pinecone Index initialisiert:', process.env.PINECONE_INDEX)

    // Lösche alle Vektoren für dieses Template
    try {
      await index.deleteMany({
        filter: {
          templateId: params.id
        }
      });
      console.log('Vektoren erfolgreich gelöscht')
    } catch (deleteError) {
      console.error('Fehler beim Löschen:', deleteError)
      throw deleteError
    }

    return NextResponse.json({ 
      success: true,
      message: 'Alle Daten wurden erfolgreich gelöscht'
    })
  } catch (error) {
    console.error('Detaillierter Fehler beim Löschen der Template-Daten:', {
      error,
      message: error instanceof Error ? error.message : 'Unbekannter Fehler',
      stack: error instanceof Error ? error.stack : undefined
    })
    
    return NextResponse.json(
      { 
        error: 'Fehler beim Löschen der Daten',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler'
      },
      { status: 500 }
    )
  }
} 