import { config } from 'dotenv'
import { Pinecone } from '@pinecone-database/pinecone'

// Lade Umgebungsvariablen
config({ path: '.env.development' })

const PINECONE_API_KEY = process.env.PINECONE_API_KEY || ''
const PINECONE_INDEX = process.env.PINECONE_INDEX || ''
const PINECONE_HOST = process.env.PINECONE_HOST || ''
const TEMPLATE_ID = 'cm6x3ocgb0004ywzwmo65dr04'

if (!PINECONE_API_KEY || !PINECONE_INDEX || !PINECONE_HOST) {
  console.error('Fehlende Umgebungsvariablen!')
  console.error('PINECONE_API_KEY:', !!PINECONE_API_KEY)
  console.error('PINECONE_INDEX:', PINECONE_INDEX)
  console.error('PINECONE_HOST:', PINECONE_HOST)
  process.exit(1)
}

async function clearVectors() {
  try {
    console.log('Initialisiere Pinecone...')
    console.log('Index:', PINECONE_INDEX)
    console.log('Host:', PINECONE_HOST)
    
    const pinecone = new Pinecone({
      apiKey: PINECONE_API_KEY
    })

    const index = pinecone.index(PINECONE_INDEX)

    // Prüfe zunächst, ob der Index existiert
    try {
      const stats = await index.describeIndexStats()
      console.log('Index-Statistiken:', stats)
    } catch (error) {
      console.error('Fehler beim Abrufen der Index-Statistiken:', error)
      process.exit(1)
    }

    console.log(`Lösche Vektoren für Template ${TEMPLATE_ID}...`)
    await index.deleteMany({
      filter: {
        templateId: { $eq: TEMPLATE_ID }
      }
    })
    
    console.log('Vektoren wurden erfolgreich gelöscht!')
    process.exit(0)
  } catch (error) {
    console.error('Fehler beim Löschen der Vektoren:', error)
    if (error instanceof Error) {
      console.error('Fehlerdetails:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
    }
    process.exit(1)
  }
}

clearVectors() 