import { SmartSearch } from '../../src/lib/services/search/core'
import { SearchContext } from '../../src/lib/services/search/types'
import { Index, Pinecone } from '@pinecone-database/pinecone'

// Mock OpenAI
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      embeddings: {
        create: jest.fn().mockResolvedValue({
          data: [{ embedding: new Array(1536).fill(0.1) }]
        })
      },
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: JSON.stringify({
                  intent: 'service_inquiry',
                  topics: ['service'],
                  requirements: ['mitgliedschaft']
                })
              }
            }]
          })
        }
      }
    }))
  }
})

// Mock Pinecone
jest.mock('@pinecone-database/pinecone', () => {
  const mockIndex = {
    query: jest.fn().mockResolvedValue({
      matches: [
        {
          id: '1',
          score: 0.8,
          metadata: {
            text: 'Dies ist ein Service-Text über Buchungen.',
            type: 'service',
            title: 'Service Buchung',
            content: 'Service-Informationen'
          }
        }
      ]
    })
  }

  return {
    Pinecone: jest.fn().mockImplementation(() => ({
      index: jest.fn().mockReturnValue(mockIndex)
    }))
  }
})

describe('SmartSearch Integration', () => {
  let searchHandler: SmartSearch

  beforeEach(() => {
    searchHandler = new SmartSearch({
      openaiApiKey: 'test-openai-key',
      pineconeApiKey: 'test-pinecone-key',
      pineconeIndex: 'test-index',
      templateId: 'test-template'
    })
  })

  it('should handle service queries correctly', async () => {
    const context: SearchContext = {
      query: 'Wie kann ich einen Service buchen?',
      templateId: 'test-template'
    }

    const result = await searchHandler.search(context)

    expect(result).toBeDefined()
    expect(result.type).toBe('service')
    expect(result.text).toBeDefined()
    expect(result.metadata).toBeDefined()
  })

  it('should handle info queries correctly', async () => {
    const context: SearchContext = {
      query: 'Was sind die Öffnungszeiten?',
      templateId: 'test-template'
    }

    const result = await searchHandler.search(context)

    expect(result).toBeDefined()
    expect(result.type).toBe('service')
    expect(result.text).toBeDefined()
    expect(result.metadata).toBeDefined()
  })

  it('should handle errors gracefully', async () => {
    const mockPinecone = new Pinecone({ apiKey: 'test-key' })
    const mockIndex = mockPinecone.index('test-index')

    // Simuliere einen Fehler bei der Pinecone-Abfrage
    jest.spyOn(mockIndex, 'query').mockRejectedValueOnce(new Error('Pinecone error'))

    const context: SearchContext = {
      query: 'Test query',
      templateId: 'test-template'
    }

    await expect(searchHandler.search(context)).rejects.toThrow()
  })
}) 