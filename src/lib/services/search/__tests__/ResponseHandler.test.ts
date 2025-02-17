import { ResponseHandler } from '../../response/ResponseHandler'
import { SearchContext, StructuredResponse } from '../types'
import { ContextManager } from '../../context/ContextManager'

jest.mock('../../context/ContextManager')

describe('ResponseHandler', () => {
  let responseHandler: ResponseHandler
  let mockContextManager: jest.Mocked<ContextManager>

  beforeEach(() => {
    mockContextManager = new ContextManager({
      maxHistoryLength: 10,
      contextTtl: 3600,
      similarityThreshold: 0.7,
      redis: {} as any
    }) as jest.Mocked<ContextManager>

    responseHandler = new ResponseHandler({
      maxLength: 1000,
      formatOptions: {
        includeMetadata: true,
        includeConfidence: true,
        formatMarkdown: true
      },
      contextManager: mockContextManager
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Response Processing', () => {
    const mockResponse: StructuredResponse = {
      answer: 'test answer',
      confidence: 0.9,
      metadata: {
        source: 'test'
      }
    }

    const mockContext: SearchContext = {
      query: 'test query',
      templateId: 'test-template'
    }

    it('sollte eine Antwort korrekt formatieren', async () => {
      const result = await responseHandler.processResponse(mockResponse, mockContext)

      expect(result.answer).toBeDefined()
      expect(result.metadata).toBeDefined()
      expect(result.confidence).toBeDefined()
    })

    it('sollte die maximale Länge einhalten', async () => {
      const longAnswer = 'a'.repeat(2000)
      const response: StructuredResponse = {
        ...mockResponse,
        answer: longAnswer
      }

      const result = await responseHandler.processResponse(response, mockContext)
      expect(result.answer.length).toBeLessThanOrEqual(1000)
    })

    it('sollte Metadaten korrekt einbinden', async () => {
      const result = await responseHandler.processResponse(mockResponse, mockContext)
      expect(result.metadata).toHaveProperty('source')
    })

    it('sollte den Kontext aktualisieren', async () => {
      mockContextManager.updateContext.mockResolvedValue()

      await responseHandler.processResponse(mockResponse, {
        ...mockContext,
        sessionId: 'test-session'
      })

      expect(mockContextManager.updateContext).toHaveBeenCalled()
    })
  })

  describe('Formatierung', () => {
    it('sollte Markdown korrekt formatieren', async () => {
      const response: StructuredResponse = {
        answer: '# Test\n## Subtest',
        confidence: 0.9
      }

      const result = await responseHandler.processResponse(response, {
        query: 'test',
        templateId: 'test'
      })

      expect(result.answer).toContain('#')
    })

    it('sollte HTML escapen wenn nötig', async () => {
      const response: StructuredResponse = {
        answer: '<script>alert("test")</script>',
        confidence: 0.9
      }

      const result = await responseHandler.processResponse(response, {
        query: 'test',
        templateId: 'test'
      })

      expect(result.answer).not.toContain('<script>')
    })
  })

  describe('Fehlerbehandlung', () => {
    it('sollte bei fehlender Antwort einen Fehler werfen', async () => {
      const invalidResponse = {} as StructuredResponse

      await expect(responseHandler.processResponse(invalidResponse, {
        query: 'test',
        templateId: 'test'
      })).rejects.toThrow()
    })

    it('sollte bei Kontext-Fehlern graceful degradieren', async () => {
      mockContextManager.updateContext.mockRejectedValue(new Error('Context error'))

      const result = await responseHandler.processResponse({
        answer: 'test',
        confidence: 0.9
      }, {
        query: 'test',
        templateId: 'test',
        sessionId: 'test-session'
      })

      expect(result.answer).toBeDefined()
    })
  })
}) 