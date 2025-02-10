import { config } from 'dotenv'
import { WebsiteScanner } from '../src/lib/services/scanner.js'
import path from 'path'
import { fileURLToPath } from 'url'

// Lade Umgebungsvariablen
config({ path: '.env.development' })

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const PINECONE_API_KEY = process.env.PINECONE_API_KEY || ''
const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT || ''
const PINECONE_INDEX = process.env.PINECONE_INDEX || ''
const TEMPLATE_ID = 'cm6x3ocgb0004ywzwmo65dr04'

if (!OPENAI_API_KEY || !PINECONE_API_KEY || !PINECONE_ENVIRONMENT || !PINECONE_INDEX) {
  console.error('Fehlende Umgebungsvariablen!')
  process.exit(1)
}

async function indexMarkdown() {
  try {
    console.log('Initialisiere Scanner...')
    const scanner = new WebsiteScanner({
      openaiApiKey: OPENAI_API_KEY,
      pineconeApiKey: PINECONE_API_KEY,
      pineconeEnvironment: PINECONE_ENVIRONMENT,
      pineconeIndex: PINECONE_INDEX,
      templateId: TEMPLATE_ID
    })

    // Bestimme das Markdown-Verzeichnis relativ zum Projektroot
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const markdownDir = path.resolve(__dirname, '../data/scans')
    
    console.log(`Starte Indexierung von Markdown-Dateien in: ${markdownDir}`)
    await scanner.scanMarkdownDirectory(markdownDir)
    
    console.log('Markdown-Indexierung erfolgreich abgeschlossen!')
    process.exit(0)
  } catch (error) {
    console.error('Fehler bei der Markdown-Indexierung:', error)
    process.exit(1)
  }
}

indexMarkdown() 