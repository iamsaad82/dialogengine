import { ResponseGenerator } from '../generator'
import { OpenAI } from 'openai'
import { Anthropic } from '@anthropic-ai/sdk'
import { ContentTypeEnum } from '@/lib/types/contentTypes'
import { SearchResult, SearchContext, QueryAnalysis } from '../../types'

// Mock OpenAI und Anthropic
jest.mock('openai')
jest.mock('@anthropic-ai/sdk')

describe('ResponseGenerator', () => {
  let generator: ResponseGenerator
  let mockOpenAI: jest.Mocked<OpenAI>
  let mockAnthropic: jest.Mocked<Anthropic>

  beforeEach(() => {
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    } as unknown as jest.Mocked<OpenAI>

    mockAnthropic = {
      messages: {
        create: jest.fn()
      }
    } as unknown as jest.Mocked<Anthropic>

    generator = new ResponseGenerator({
      openai: mockOpenAI,
      anthropic: mockAnthropic,
      temperature: 0.7,
      maxTokens: 500
    })
  })

  describe('generateResponse', () => {
    const mockContext: SearchContext = {
      query: 'Wie funktioniert die Krankenversicherung?',
      templateId: 'test-template'
    }

    const mockResults: SearchResult[] = [{
      url: 'test.com',
      title: 'Krankenversicherung Info',
      content: 'Informationen zur Krankenversicherung',
      score: 0.9,
      metadata: {
        type: ContentTypeEnum.INSURANCE,
        title: 'Test'
      }
    }]

    const mockAnalysis: QueryAnalysis = {
      intent: 'information_seeking',
      topics: ['versicherung'],
      requirements: ['mitgliedschaft']
    }

    it('sollte eine strukturierte Antwort generieren', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'Generierte Antwort zur Krankenversicherung'
          }
        }]
      } as any)

      const response = await generator.generateResponse(
        mockContext,
        mockResults,
        ContentTypeEnum.INSURANCE,
        mockAnalysis
      )

      expect(response).toMatchObject({
        type: ContentTypeEnum.INSURANCE,
        text: expect.any(String),
        metadata: expect.any(Object)
      })
    })

    it('sollte Anthropic als Fallback nutzen', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('OpenAI Error'))
      mockAnthropic.messages.create.mockResolvedValueOnce({
        content: [{
          text: 'Anthropic Antwort zur Krankenversicherung'
        }]
      } as any)

      const response = await generator.generateResponse(
        mockContext,
        mockResults,
        ContentTypeEnum.INSURANCE,
        mockAnalysis
      )

      expect(response).toMatchObject({
        type: ContentTypeEnum.INSURANCE,
        text: expect.any(String),
        metadata: expect.any(Object)
      })
      expect(mockAnthropic.messages.create).toHaveBeenCalled()
    })

    it('sollte relevante Metadaten extrahieren', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'Antwort mit Metadaten'
          }
        }]
      } as any)

      const response = await generator.generateResponse(
        mockContext,
        [{
          ...mockResults[0],
          metadata: {
            ...mockResults[0].metadata,
            requirements: ['test-requirement'],
            actions: [{ label: 'Test Action', url: 'test.com' }]
          }
        }],
        ContentTypeEnum.INSURANCE,
        mockAnalysis
      )

      expect(response.metadata).toMatchObject({
        requirements: expect.any(Array),
        actions: expect.any(Array)
      })
    })
  })
}) 