import { config } from 'dotenv'
import { FirecrawlScanner } from '../src/lib/services/firecrawl'

// Lade Umgebungsvariablen
config({ path: '.env.development' })

const OPENAI_API_KEY = process.env.OPENAI_API_KEY as string
const PINECONE_API_KEY = process.env.PINECONE_API_KEY as string
const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT
const PINECONE_HOST = process.env.PINECONE_HOST
const PINECONE_INDEX = process.env.PINECONE_INDEX
const REDIS_URL = process.env.REDIS_URL
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY as string

if (!OPENAI_API_KEY || !PINECONE_API_KEY || !FIRECRAWL_API_KEY) {
  console.error('Fehlende Umgebungsvariablen!')
  process.exit(1)
}

async function main() {
  try {
    const scanner = new FirecrawlScanner({
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      pineconeApiKey: process.env.PINECONE_API_KEY || '',
      firecrawlApiKey: process.env.FIRECRAWL_API_KEY || '',
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
      pineconeIndex: process.env.PINECONE_INDEX || '',
      pineconeHost: process.env.PINECONE_HOST
    })
    
    // Test-URL
    const testUrl = 'https://example.com'
    
    console.log('Starte Website-Scan mit Firecrawl...')
    const jobId = await scanner.startCrawl(testUrl)
    console.log('Scan gestartet mit Job-ID:', jobId)
    
    // Überwache den Status
    let status = await scanner.checkStatus(jobId)
    console.log('Initialer Status:', status)

    while (status && status.status === 'running') {
      await new Promise(resolve => setTimeout(resolve, 5000))
      status = await scanner.checkStatus(jobId)
      console.log('Aktueller Status:', status)
    }
  } catch (error) {
    console.error('Fehler beim Scannen:', error)
    process.exit(1)
  }
}

main() 