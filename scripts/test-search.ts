import { config } from 'dotenv'
import { Pinecone } from '@pinecone-database/pinecone'
import { OpenAI } from 'openai'

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

async function testSearch() {
  try {
    console.log('Initialisiere OpenAI...')
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

    console.log('Initialisiere Pinecone...')
    const pinecone = new Pinecone()
    const index = pinecone.index(PINECONE_INDEX)

    // Erstelle Embedding für die Suchanfrage
    console.log('Erstelle Embedding für Suchanfrage...')
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: 'ich möchte mehr Sport machen'
    })
    const queryEmbedding = embeddingResponse.data[0].embedding

    // Suche in Pinecone
    console.log('Suche in Pinecone...')
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: 50,
      includeMetadata: true,
      filter: {
        templateId: { $eq: TEMPLATE_ID }
      }
    })

    // Zeige Ergebnisse
    console.log('\nGefundene Dokumente:')
    console.log('==================')
    
    if (!queryResponse.matches) {
      console.log('Keine Ergebnisse gefunden')
      return
    }

    // Definiere relevante Kategorien und ihre Keywords mit Gewichtung
    const categories = {
      sport: {
        keywords: ['sport', 'bewegung', 'fitness', 'training', 'aktivität', 'bewegte'],
        weight: 0.3
      },
      gesundheit: {
        keywords: ['gesundheit', 'vorsorge', 'prävention', 'wohlbefinden'],
        weight: 0.2
      },
      angebote: {
        keywords: ['kurs', 'beratung', 'programm', 'coaching', 'call4fit'],
        weight: 0.2
      }
    }

    // Bewerte die Relevanz der Ergebnisse
    const scoredMatches = queryResponse.matches.map(match => {
      const metadata = match.metadata as Record<string, any>
      const text = `${metadata.title || ''} ${metadata.content || ''} ${metadata.url || ''}`.toLowerCase()
      
      // Berechne Relevanz-Score für jede Kategorie
      let relevanceScore = match.score || 0
      Object.entries(categories).forEach(([categoryName, category]) => {
        category.keywords.forEach(keyword => {
          if (text.includes(keyword)) {
            relevanceScore += category.weight // Gewichteter Bonus für jedes Keyword
          }
        })
      })

      // Bonus für Sport-spezifische URLs
      if (metadata.url?.includes('sport') || metadata.url?.includes('fitness')) {
        relevanceScore += 0.5
      }

      // Bonus für Sport-spezifische Titel
      if (metadata.title?.toLowerCase().includes('sport') || 
          metadata.title?.toLowerCase().includes('bewegung') ||
          metadata.title?.toLowerCase().includes('fitness')) {
        relevanceScore += 0.3
      }

      return {
        ...match,
        relevanceScore,
        categories: Object.entries(categories)
          .filter(([_, category]) => 
            category.keywords.some(keyword => text.includes(keyword)))
          .map(([name]) => name)
      }
    })

    // Sortiere nach kombiniertem Score
    const sortedMatches = scoredMatches
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10)

    // Zeige die relevantesten Ergebnisse
    sortedMatches.forEach((match, index) => {
      const metadata = match.metadata as Record<string, any>
      console.log(`\n${index + 1}. Treffer (Score: ${match.relevanceScore.toFixed(3)})`)
      console.log('Titel:', metadata.title || 'Kein Titel')
      console.log('URL:', metadata.url || 'Keine URL')
      console.log('Kategorien:', match.categories.join(', '))
      if (typeof metadata.content === 'string') {
        console.log('Vorschau:', metadata.content.substring(0, 200) + '...')
      }
      console.log('---')
    })

  } catch (error) {
    console.error('Fehler bei der Suche:', error)
    process.exit(1)
  }
}

testSearch() 