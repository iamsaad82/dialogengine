import { Pinecone } from '@pinecone-database/pinecone'
import dotenv from 'dotenv'

// Lade Umgebungsvariablen
dotenv.config()

const INDEX_NAME = process.env.PINECONE_INDEX || 'dialog-engine'

async function clearIndex() {
  try {
    console.log(`Lösche alle Vektoren im Index ${INDEX_NAME}...`)
    
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || ''
    })

    const index = pinecone.index(INDEX_NAME)
    
    await index.deleteAll()
    
    console.log('Vektoren erfolgreich gelöscht')
  } catch (error) {
    console.error('Fehler beim Löschen der Vektoren:', error)
    process.exit(1)
  }
}

clearIndex() 