import { SmartSearchHandler } from '../dist/lib/services/smartSearch.js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Lade Umgebungsvariablen
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '..', '.env.local')
dotenv.config({ path: envPath })

const TEMPLATE_ID = 'cm6voqaz40004yw0aon09wrhq'

async function testDialog() {
  try {
    console.log('Starte Dialog-Test...\n')

    const smartSearch = new SmartSearchHandler({
      openaiApiKey: process.env.OPENAI_API_KEY || '',
      pineconeApiKey: process.env.PINECONE_API_KEY || '',
      pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || '',
      pineconeIndex: process.env.PINECONE_INDEX || '',
      templateId: TEMPLATE_ID,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY
    })

    // Test-Fragen
    const questions = [
      'Was bietet die AOK für Schwangere an?',
      'Wie funktioniert die Familienversicherung?',
      'Welche alternativen Heilmethoden werden von der AOK übernommen?'
    ]

    for (const question of questions) {
      console.log(`\nFrage: ${question}`)
      console.log('Suche Antwort...')

      try {
        const response = await smartSearch.handleQuery(question)
        
        console.log('\nAntwort:')
        console.log(response.text)
        
        if (response.sources && response.sources.length > 0) {
          console.log('\nQuellen:')
          response.sources.forEach((source, index) => {
            console.log(`${index + 1}. ${source.title} (${source.url})`)
          })
        } else {
          console.log('\nKeine Quellen gefunden.')
        }
        
        console.log('\nMetadaten:')
        console.log('- Typ:', response.type)
        console.log('- Felder:', Object.keys(response.metadata || {}).join(', '))
      } catch (error) {
        console.error(`Fehler bei Frage "${question}":`, error)
      }
      
      console.log('\n---')
      
      // Kurze Pause zwischen den Fragen
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    console.log('\nDialog-Test abgeschlossen!')
  } catch (error) {
    console.error('Fehler beim Dialog-Test:', error)
    process.exit(1)
  }
}

testDialog() 