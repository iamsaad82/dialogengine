import { config } from 'dotenv'
import { Pinecone } from '@pinecone-database/pinecone'

// Lade Umgebungsvariablen
config({ path: '.env.development' })

const PINECONE_API_KEY = process.env.PINECONE_API_KEY || ''
const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT || ''
const PINECONE_INDEX = process.env.PINECONE_INDEX || ''

const OLD_TEMPLATE_ID = 'cm6voqaz40004yw0aon09wrhq'
const NEW_TEMPLATE_ID = 'cm6x3ocgb0004ywzwmo65dr04'

if (!PINECONE_API_KEY || !PINECONE_ENVIRONMENT || !PINECONE_INDEX) {
  console.error('Fehlende Umgebungsvariablen!')
  process.exit(1)
}

async function updateTemplateIds() {
  try {
    console.log('Initialisiere Pinecone Client...')
    const pinecone = new Pinecone()

    const index = pinecone.index(PINECONE_INDEX)

    // Hole alle Vektoren mit der alten Template-ID
    console.log(`Suche Vektoren mit Template-ID: ${OLD_TEMPLATE_ID}`)
    
    // Erstelle einen Dummy-Vektor für die Suche
    const dummyVector = new Array(1536).fill(0)
    
    const queryResponse = await index.query({
      vector: dummyVector,
      topK: 10000,
      filter: {
        templateId: { $eq: OLD_TEMPLATE_ID }
      },
      includeMetadata: true
    })

    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      console.log('Keine Vektoren mit der alten Template-ID gefunden.')
      return
    }

    console.log(`Gefunden: ${queryResponse.matches.length} Vektoren`)

    // Update die Template-ID in allen gefundenen Vektoren
    for (const match of queryResponse.matches) {
      if (!match.id || !match.metadata) continue

      const metadata = match.metadata as any
      metadata.templateId = NEW_TEMPLATE_ID

      await index.update({
        id: match.id,
        metadata: metadata
      })

      console.log(`Aktualisiert: ${match.id}`)
    }

    console.log('Template-IDs erfolgreich aktualisiert!')
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Template-IDs:', error)
    process.exit(1)
  }
}

updateTemplateIds() 