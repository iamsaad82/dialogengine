import OpenAI from 'openai'
import { Pinecone } from '@pinecone-database/pinecone'

async function testSearch(query) {
  try {
    // Initialisiere OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    // Erstelle Embedding für die Query
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
      dimensions: 1536
    })

    // Initialisiere Pinecone
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    })

    const index = pinecone.index('dialog-engine')

    // Führe Suche durch
    const results = await index.query({
      vector: embedding.data[0].embedding,
      topK: 5,
      includeMetadata: true
    })

    console.log('Query:', query)
    console.log('\nResults:')
    results.matches.forEach((match, i) => {
      console.log(`\n${i + 1}. Score: ${match.score}`)
      console.log('Metadata:', JSON.stringify(match.metadata, null, 2))
      if (match.metadata?.text) {
        console.log('Text:', match.metadata.text.substring(0, 200) + '...')
      }
    })

  } catch (error) {
    console.error('Error:', error)
  }
}

// Teste verschiedene Queries
const queries = [
  'Was kostet ein Krankenhausaufenthalt?',
  'Wie lange kann ich im Krankenhaus bleiben?',
  'Was passiert mit meinem Lohn im Krankenhaus?'
]

async function runTests() {
  for (const query of queries) {
    console.log('\n=== Testing Query ===')
    await testSearch(query)
    console.log('\n===================\n')
    // Warte kurz zwischen den Anfragen
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}

runTests() 