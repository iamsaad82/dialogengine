import { SmartSearch } from '../search'
import { ContentVectorizer } from '../vectorizer'
import { QueryAnalyzer } from '../analyzer'
import { ResponseGenerator } from '../generator'
import { HandlerManager } from '../../handlers/manager'
import { ContentTypeEnum } from '@/lib/types/contentTypes'
import { SearchContext, SearchResult, QueryAnalysis } from '../../types'

// Mock alle Abhängigkeiten
jest.mock('../vectorizer')
jest.mock('../analyzer')
jest.mock('../generator')
jest.mock('../../handlers/manager')

describe('SmartSearch', () => {
  let search: SmartSearch
  let mockVectorizer: jest.Mocked<ContentVectorizer>
  let mockAnalyzer: jest.Mocked<QueryAnalyzer>
  let mockGenerator: jest.Mocked<ResponseGenerator>
  let mockHandlerManager: jest.Mocked<HandlerManager>

  beforeEach(() => {
    // Setup mocks
    mockVectorizer = {
      vectorizeQuery: jest.fn(),
      searchSimilar: jest.fn()
    } as unknown as jest.Mocked<ContentVectorizer>

    mockAnalyzer = {
      analyzeQuery: jest.fn(),
      determineResponseType: jest.fn()
    } as unknown as jest.Mocked<QueryAnalyzer>

    mockGenerator = {
      generateResponse: jest.fn()
    } as unknown as jest.Mocked<ResponseGenerator>

    mockHandlerManager = {
      handleRequest: jest.fn()
    } as unknown as jest.Mocked<HandlerManager>

    // Initialisiere SmartSearch mit Mocks
    search = new SmartSearch({
      openaiApiKey: 'test-key',
      pineconeApiKey: 'test-key',
      pineconeEnvironment: 'test-env',
      pineconeIndex: 'test-index',
      templateId: 'test-template'
    })

    // Injiziere Mocks
    Object.assign(search, {
      vectorizer: mockVectorizer,
      analyzer: mockAnalyzer,
      generator: mockGenerator,
      handlerManager: mockHandlerManager
    })
  })

  describe('search', () => {
    const mockContext: SearchContext = {
      query: 'Wie funktioniert die Krankenversicherung?',
      templateId: 'test-template'
    }

    const mockQueryAnalysis: QueryAnalysis = {
      intent: 'information_seeking',
      topics: ['versicherung'],
      requirements: ['mitgliedschaft']
    }

    const mockSearchResults: SearchResult[] = [{
      url: 'test.com',
      title: 'Test',
      content: 'Test content',
      score: 0.9,
      metadata: {
        type: ContentTypeEnum.INSURANCE,
        title: 'Test'
      }
    }]

    it('sollte den kompletten Suchprozess durchführen', async () => {
      // Mock Rückgabewerte
      mockAnalyzer.analyzeQuery.mockResolvedValueOnce(mockQueryAnalysis)
      mockVectorizer.vectorizeQuery.mockResolvedValueOnce(new Array(1536).fill(0.1))
      mockVectorizer.searchSimilar.mockResolvedValueOnce(mockSearchResults)
      mockAnalyzer.determineResponseType.mockReturnValueOnce(ContentTypeEnum.INSURANCE)
      mockGenerator.generateResponse.mockResolvedValueOnce({
        type: ContentTypeEnum.INSURANCE,
        text: 'Generierte Antwort',
        metadata: {}
      })

      const result = await search.search(mockContext)

      expect(result).toMatchObject({
        type: ContentTypeEnum.INSURANCE,
        text: 'Generierte Antwort',
        metadata: expect.any(Object)
      })

      // Verifiziere Aufrufreihenfolge
      expect(mockAnalyzer.analyzeQuery).toHaveBeenCalledWith(mockContext.query)
      expect(mockVectorizer.vectorizeQuery).toHaveBeenCalled()
      expect(mockVectorizer.searchSimilar).toHaveBeenCalled()
      expect(mockGenerator.generateResponse).toHaveBeenCalled()
    })

    it('sollte den Handler-Manager für spezialisierte Anfragen nutzen', async () => {
      mockAnalyzer.analyzeQuery.mockResolvedValueOnce(mockQueryAnalysis)
      mockHandlerManager.handleRequest.mockResolvedValueOnce({
        type: ContentTypeEnum.INSURANCE,
        text: 'Handler Antwort',
        metadata: {}
      })

      const result = await search.search(mockContext)

      expect(result).toMatchObject({
        type: ContentTypeEnum.INSURANCE,
        text: 'Handler Antwort',
        metadata: expect.any(Object)
      })
    })

    it('sollte Fehler korrekt behandeln', async () => {
      mockAnalyzer.analyzeQuery.mockRejectedValueOnce(new Error('Test Error'))

      await expect(search.search(mockContext)).rejects.toThrow('Test Error')
    })
  })

  describe('handleFeedback', () => {
    it('sollte Feedback speichern', async () => {
      const feedback = 'Sehr hilfreich'
      const sessionId = 'test-session'

      await search.handleFeedback(feedback, sessionId)
      // Hier könnten weitere Assertions hinzugefügt werden, wenn die Feedback-Funktionalität implementiert ist
    })
  })
}) 