import { config } from 'dotenv'
import { Pinecone } from '@pinecone-database/pinecone'

// Lade zuerst .env.local, falls vorhanden
try {
  config({ path: '.env.local' })
} catch (error) {
  console.log('.env.local nicht gefunden, überspringe...')
}

// Lade dann .env.test
config({ path: '.env.test' })

const PINECONE_API_KEY = process.env.PINECONE_API_KEY
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX || 'dialog-engine'
const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT || 'gcp-europe-west4-de1d'

async function setupPineconeIndex() {
  try {
    console.log('Initialisiere Pinecone...')
    console.log('Konfiguration:', {
      indexName: PINECONE_INDEX_NAME,
      environment: PINECONE_ENVIRONMENT
    })
    
    if (!PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY ist nicht gesetzt')
    }

    // Initialisiere Pinecone
    const pc = new Pinecone({
      apiKey: PINECONE_API_KEY
    })

    // Liste alle vorhandenen Indizes
    console.log('Prüfe vorhandene Indizes...')
    const indexList = await pc.listIndexes()
    console.log('Vorhandene Indizes:', indexList.indexes?.map(idx => idx.name) || [])

    // Prüfe Details für jeden Index
    if (indexList.indexes?.length > 0) {
      for (const index of indexList.indexes) {
        console.log(`\nDetails für Index ${index.name}:`)
        try {
          const details = await pc.describeIndex(index.name)
          console.log(JSON.stringify(details, null, 2))
        } catch (error) {
          console.error(`Fehler beim Abrufen der Details für ${index.name}:`, error)
        }
      }
    }

    // Prüfe, ob der Index existiert
    const indexExists = indexList.indexes?.some(index => index.name === PINECONE_INDEX_NAME)
    
    if (!indexExists) {
      throw new Error(`Index ${PINECONE_INDEX_NAME} existiert nicht. Bitte stellen Sie sicher, dass der Index bereits erstellt wurde.`)
    }

    // Zeige finale Index-Statistiken
    const index = pc.index(PINECONE_INDEX_NAME)
    console.log('\nFinale Index-Details:')
    console.log(await pc.describeIndex(PINECONE_INDEX_NAME))
    
    const stats = await index.describeIndexStats()
    console.log('\nIndex-Statistiken:', stats)

    console.log('\nSetup erfolgreich abgeschlossen!')
    process.exit(0)
  } catch (error) {
    console.error('\nFehler beim Setup:', error)
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

setupPineconeIndex() 