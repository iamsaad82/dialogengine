import { OpenAI } from 'openai'
import { Anthropic } from '@anthropic-ai/sdk'
import { Pinecone } from '@pinecone-database/pinecone'
import { ContentTypeEnum } from '../../../../../src/lib/types/contentTypes'

export const createMockOpenAI = () => {
  const mockCreate = jest.fn()
  const mockEmbeddingsCreate = jest.fn()

  return {
    chat: {
      completions: {
        create: mockCreate
      }
    },
    embeddings: {
      create: mockEmbeddingsCreate
    }
  } as unknown as jest.Mocked<OpenAI> & {
    chat: {
      completions: {
        create: jest.Mock
      }
    },
    embeddings: {
      create: jest.Mock
    }
  }
}

export const createMockAnthropic = () => {
  const mockCreate = jest.fn()

  return {
    messages: {
      create: mockCreate
    }
  } as unknown as jest.Mocked<Anthropic> & {
    messages: {
      create: jest.Mock
    }
  }
}

export const createMockPinecone = () => {
  const mockIndex = {
    query: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn()
  }

  return {
    index: jest.fn().mockReturnValue(mockIndex)
  } as unknown as jest.Mocked<Pinecone>
}

// Beispiel-Daten für Tests
export const mockSearchResult = {
  url: 'test.com',
  title: 'Test Document',
  content: 'Test content',
  score: 0.9,
  metadata: {
    type: 'info',
    title: 'Test'
  }
}

export const mockQueryAnalysis = {
  intent: 'information_seeking',
  topics: ['test'],
  requirements: ['requirement'],
  timeframe: 'immediate',
  expectedActions: ['action']
} 