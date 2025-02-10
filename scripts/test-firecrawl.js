import { config } from 'dotenv'
import { FirecrawlScanner } from '../src/lib/services/firecrawl.js'

// Lade Umgebungsvariablen
config({ path: '.env.development' })

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const PINECONE_API_KEY = process.env.PINECONE_API_KEY
const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT
const PINECONE_HOST = process.env.PINECONE_HOST
const PINECONE_INDEX = process.env.PINECONE_INDEX
const REDIS_URL = process.env.REDIS_URL
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY

if (!OPENAI_API_KEY || !PINECONE_API_KEY || !FIRECRAWL_API_KEY) {
  console.error('Fehlende Umgebungsvariablen!')
  process.exit(1)
}

async function main() {
  const scanner = new FirecrawlScanner({
    openaiApiKey: OPENAI_API_KEY,
    pineconeApiKey: PINECONE_API_KEY,
    firecrawlApiKey: FIRECRAWL_API_KEY,
    pineconeEnvironment: PINECONE_ENVIRONMENT,
    pineconeHost: PINECONE_HOST,
    pineconeIndex: PINECONE_INDEX,
    redisUrl: REDIS_URL
  })

  try {
    // Test-URL (ersetzen Sie diese durch eine relevante URL)
    const testUrl = 'https://example.com'
    
    console.log('Starte Website-Scan mit Firecrawl...')
    await scanner.scanWebsite(testUrl)
    console.log('Scan erfolgreich abgeschlossen!')
  } catch (error) {
    console.error('Fehler beim Scannen:', error)
    process.exit(1)
  }
}

main() 