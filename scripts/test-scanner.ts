import { config } from 'dotenv'
import { WebsiteScanner } from '../src/lib/services/scanner'

// Lade Umgebungsvariablen
config({ path: '.env.development' })

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const PINECONE_API_KEY = process.env.PINECONE_API_KEY
const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT
const PINECONE_HOST = process.env.PINECONE_HOST
const PINECONE_INDEX = process.env.PINECONE_INDEX
const TEMPLATE_ID = process.env.DEFAULT_TEMPLATE_ID || 'default'

if (!OPENAI_API_KEY || !PINECONE_API_KEY || !PINECONE_ENVIRONMENT || !PINECONE_INDEX) {
  console.error('Fehlende Umgebungsvariablen!')
  process.exit(1)
}

async function main() {
  const scanner = new WebsiteScanner({
    openaiApiKey: OPENAI_API_KEY as string,
    pineconeApiKey: PINECONE_API_KEY as string,
    pineconeEnvironment: PINECONE_ENVIRONMENT as string,
    pineconeHost: PINECONE_HOST,
    pineconeIndex: PINECONE_INDEX as string,
    templateId: TEMPLATE_ID
  })

  try {
    // Test-URL (ersetzen Sie diese durch eine relevante URL)
    const testUrl = 'https://example.com'
    
    console.log('Starte Website-Scan...')
    await scanner.scanWebsite(testUrl)
    console.log('Scan erfolgreich abgeschlossen!')
  } catch (error) {
    console.error('Fehler beim Scannen:', error)
    process.exit(1)
  }
}

main() 