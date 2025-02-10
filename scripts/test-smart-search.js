import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { performance } from 'perf_hooks'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: resolve(__dirname, '../.env.local') })

import { SmartSearch } from '../dist/lib/services/search/core.js'

async function testSmartSearch() {
  console.log('Starting SmartSearch test...')
  
  const smartSearch = new SmartSearch({
    openaiApiKey: process.env.OPENAI_API_KEY,
    pineconeApiKey: process.env.PINECONE_API_KEY,
    pineconeEnvironment: process.env.PINECONE_ENVIRONMENT,
    pineconeIndex: process.env.PINECONE_INDEX,
    pineconeHost: process.env.PINECONE_HOST,
    redisUrl: process.env.REDIS_URL,
    templateId: process.env.DEFAULT_TEMPLATE_ID,
    maxTokensPerRequest: 1000,
    similarityThreshold: 0.3
  })

  // Test-Sequenz für Krankenhaus-Fragen
  const testQueries = [
    {
      query: "Was übernimmt die AOK bei einem Krankenhausaufenthalt?",
      history: []
    },
    {
      query: "Und was ist mit der Unterbringung von Angehörigen?",
      history: [
        {
          role: "user",
          content: "Was übernimmt die AOK bei einem Krankenhausaufenthalt?"
        },
        {
          role: "assistant",
          content: JSON.stringify({
            type: "medical",
            text: "Die AOK übernimmt bei einem Krankenhausaufenthalt...",
            metadata: {
              topic: "krankenhaus",
              type: "medical"
            }
          })
        }
      ]
    }
  ]

  for (const test of testQueries) {
    console.log('\n-----------------------------------')
    console.log('Testing query:', test.query)
    console.log('With history:', test.history.length, 'messages')
    
    try {
      const startTime = performance.now()
      const response = await smartSearch.search({
        query: test.query,
        history: test.history,
        templateId: process.env.DEFAULT_TEMPLATE_ID
      })
      const duration = Math.round(performance.now() - startTime)

      console.log('\nResponse received in', duration, 'ms:')
      console.log('Type:', response.type)
      console.log('Text:', response.text.substring(0, 100) + '...')
      console.log('Metadata:', JSON.stringify(response.metadata, null, 2))
      
      if (response.sources) {
        console.log('\nSources:')
        response.sources.forEach((source, i) => {
          console.log(`\nSource ${i + 1}:`)
          console.log('URL:', source.url)
          console.log('Title:', source.title)
          if (source.snippets) {
            console.log('Top snippet:', source.snippets[0].text.substring(0, 100) + '...')
            console.log('Score:', source.snippets[0].score)
          }
        })
      }
    } catch (error) {
      console.error('Error testing query:', error)
    }
  }
}

testSmartSearch().catch(console.error) 