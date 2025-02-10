import { ContentVectorizer } from '../vectorizer'
import { OpenAI } from 'openai'
import { Pinecone } from '@pinecone-database/pinecone'

// Mock OpenAI und Pinecone
jest.mock('openai')
jest.mock('@pinecone-database/pinecone')

describe('ContentVectorizer', () => {
  let vectorizer: ContentVectorizer
  let mockOpenAI: jest.Mocked<OpenAI>
  let mockPinecone: jest.Mocked<Pinecone>
  let mockIndex: any

  beforeEach(() => {
    // Setup mocks
    mockIndex = {
      query: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn()
    }

    mockOpenAI = {
      embeddings: {
        create: jest.fn()
      }
    } as unknown as jest.Mocked<OpenAI>

    mockPinecone = {
      index: jest.fn().mockReturnValue(mockIndex)
    } as unknown as jest.Mocked<Pinecone>

    vectorizer = new ContentVectorizer({
      openai: mockOpenAI,
      pinecone: mockPinecone,
      indexName: 'test-index'
    })
  })

  describe('vectorizeQuery', () => {
    it('sollte einen Query-Vektor erstellen', async () => {
      const mockEmbedding = new Array(1536).fill(0.1)
      mockOpenAI.embeddings.create.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding }]
      } as any)

      const result = await vectorizer.vectorizeQuery('test query')
      expect(result).toEqual(mockEmbedding)
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-ada-002',
        input: 'test query'
      })
    })
  })

  describe('searchSimilar', () => {
    it('sollte ähnliche Dokumente finden', async () => {
      const mockMatches = [
        {
          metadata: {
            url: 'test.com',
            title: 'Test Doc',
            content: 'Test content'
          },
          score: 0.9
        }
      ]

      mockIndex.query.mockResolvedValueOnce({ matches: mockMatches })

      const queryVector = new Array(1536).fill(0.1)
      const results = await vectorizer.searchSimilar(queryVector, {
        topK: 1,
        minScore: 0.7
      })

      expect(results).toHaveLength(1)
      expect(results[0]).toMatchObject({
        url: 'test.com',
        title: 'Test Doc',
        content: 'Test content',
        score: 0.9
      })
    })

    it('sollte Ergebnisse nach Mindest-Score filtern', async () => {
      const mockMatches = [
        { metadata: { url: 'test1.com' }, score: 0.9 },
        { metadata: { url: 'test2.com' }, score: 0.5 }
      ]

      mockIndex.query.mockResolvedValueOnce({ matches: mockMatches })

      const queryVector = new Array(1536).fill(0.1)
      const results = await vectorizer.searchSimilar(queryVector, {
        minScore: 0.7
      })

      expect(results).toHaveLength(1)
      expect(results[0].url).toBe('test1.com')
    })
  })

  describe('vectorizeContent', () => {
    it('sollte Inhalte vektorisieren und speichern', async () => {
      const mockEmbedding = new Array(1536).fill(0.1)
      mockOpenAI.embeddings.create.mockResolvedValueOnce({
        data: [{ embedding: mockEmbedding }]
      } as any)

      const content = 'test content'
      const metadata = { url: 'test.com', title: 'Test' }

      await vectorizer.vectorizeContent(content, metadata)

      expect(mockIndex.upsert).toHaveBeenCalledWith({
        vectors: [{
          id: expect.any(String),
          values: mockEmbedding,
          metadata: expect.objectContaining({
            ...metadata,
            content,
            vectorized_at: expect.any(String)
          })
        }],
        namespace: undefined
      })
    })
  })

  describe('deleteVectors', () => {
    it('sollte Vektoren löschen', async () => {
      const ids = ['id1', 'id2']
      await vectorizer.deleteVectors(ids)

      expect(mockIndex.deleteMany).toHaveBeenCalledWith({
        ids,
        namespace: undefined
      })
    })
  })
}) 