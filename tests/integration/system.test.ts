import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { SmartSearch } from '@/lib/services/search/core/search'
import { ContentVectorizer } from '@/lib/services/search/core/vectorizer'
import { SearchConfig, SearchContext, SearchResult } from '@/lib/services/search/types'
import { Redis } from 'ioredis'
import { Pinecone } from '@pinecone-database/pinecone'
import { OpenAI } from 'openai'

describe('System Integration Tests', () => {
  let redis: Redis
  let pinecone: Pinecone
  let smartSearch: SmartSearch
  let vectorizer: ContentVectorizer
  let openai: OpenAI

  beforeAll(async () => {
    const config: SearchConfig = {
      openaiApiKey: process.env.OPENAI_API_KEY || 'test-key',
      pineconeApiKey: process.env.PINECONE_API_KEY || 'test-key',
      pineconeIndex: process.env.PINECONE_INDEX || 'test-index',
      templateId: 'test-template',
      host: 'localhost',
      port: 6379
    }

    redis = new Redis()
    openai = new OpenAI({ apiKey: config.openaiApiKey })
    pinecone = new Pinecone({ apiKey: config.pineconeApiKey })

    smartSearch = new SmartSearch(config)
    vectorizer = new ContentVectorizer({
      openai,
      pinecone,
      indexName: config.pineconeIndex
    })
  })

  afterAll(async () => {
    await smartSearch.shutdown()
    await redis.quit()
  })

  test('SmartSearch: Suche und Antwortgenerierung', async () => {
    const context: SearchContext = {
      query: 'Was sind die Öffnungszeiten?',
      language: 'de',
      templateId: 'test-template'
    }

    const response = await smartSearch.search(context)
    expect(response).toBeDefined()
    expect(response.answer).toBeDefined()
    expect(response.confidence).toBeGreaterThan(0)
  })

  test('ContentVectorizer: Dokumente indizieren', async () => {
    const testContent = 'Test Content'
    const metadata = {
      url: 'test-url',
      title: 'Test Document',
      type: 'text' as const
    }

    await vectorizer.vectorizeContent(testContent, metadata)
    const queryVector = await vectorizer.vectorizeQuery('test query')
    const results = await vectorizer.searchSimilar(queryVector)
    
    expect(results).toBeDefined()
    expect(results.length).toBeGreaterThan(0)
  })

  test('SmartSearch: System-Status überprüfen', async () => {
    const status = smartSearch.getHealthStatus()
    expect(status).toBeDefined()
    expect(status.status).toBe('healthy')
    expect(status.openai).toBe(true)
    expect(status.pinecone).toBe(true)
  })

  test('SmartSearch: Cache-Funktionalität', async () => {
    const context: SearchContext = {
      query: 'Test Query',
      templateId: 'test-template'
    }

    // Erste Suche
    const firstResponse = await smartSearch.search(context)
    expect(firstResponse).toBeDefined()

    // Zweite Suche (sollte aus dem Cache kommen)
    const secondResponse = await smartSearch.search(context)
    expect(secondResponse).toEqual(firstResponse)

    // Cache invalidieren
    await smartSearch.invalidateCache('test-template:*')
  })
}) 