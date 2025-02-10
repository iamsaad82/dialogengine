import { Pinecone } from '@pinecone-database/pinecone'

const TEMPLATE_ID = 'cm6voqaz40004yw0aon09wrhq'
const INDEX_NAME = process.env.PINECONE_INDEX || 'dialog-engine'

async function clearTemplate() {
  try {
    console.log(`Lösche Vektoren für Template ${TEMPLATE_ID}...`)
    
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || ''
    })

    const index = pinecone.index(INDEX_NAME)
    
    await index.deleteMany({
      filter: {
        templateId: TEMPLATE_ID
      }
    })
    
    console.log('Vektoren erfolgreich gelöscht')
  } catch (error) {
    console.error('Fehler beim Löschen der Vektoren:', error)
    process.exit(1)
  }
}

clearTemplate() 