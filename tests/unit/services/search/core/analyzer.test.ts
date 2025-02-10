import { QueryAnalyzer } from '../../../../../src/lib/services/search/core/analyzer'
import { createMockOpenAI } from './test-utils'
import { ContentTypeEnum } from '../../../../../src/lib/types/contentTypes'
import { SearchResult } from '../../../../../src/lib/services/search/types'

// Mock OpenAI
jest.mock('openai')

describe('QueryAnalyzer', () => {
  let analyzer: QueryAnalyzer
  let mockOpenAI: ReturnType<typeof createMockOpenAI>

  beforeEach(() => {
    mockOpenAI = createMockOpenAI()
    analyzer = new QueryAnalyzer({
      openai: mockOpenAI,
      temperature: 0.7,
      maxTokens: 150
    })
  })

  describe('analyzeQuery', () => {
    it('sollte eine Suchanfrage korrekt analysieren', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              intent: 'information_seeking',
              topics: ['versicherung'],
              requirements: ['mitgliedschaft'],
              timeframe: 'immediate',
              expectedActions: ['antrag_stellen']
            })
          }
        }]
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse)

      const result = await analyzer.analyzeQuery('Wie kann ich mich bei der AOK versichern?')
      
      expect(result).toEqual({
        intent: 'information_seeking',
        topics: ['versicherung'],
        requirements: ['mitgliedschaft'],
        timeframe: 'immediate',
        expectedActions: ['antrag_stellen']
      })
    })

    it('sollte mit ungültiger API-Antwort umgehen können', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'))
      
      await expect(analyzer.analyzeQuery('Test Query')).rejects.toThrow('API Error')
    })
  })

  describe('determineResponseType', () => {
    it('sollte den korrekten Content-Type für medizinische Anfragen erkennen', () => {
      const results: SearchResult[] = [{
        url: 'test.com',
        title: 'Medizinische Behandlung',
        content: 'Medizinischer Inhalt',
        score: 0.9,
        metadata: {
          type: ContentTypeEnum.MEDICAL,
          title: 'Test'
        }
      }]

      const type = analyzer.determineResponseType('medical_info', results)
      expect(type).toBe(ContentTypeEnum.MEDICAL)
    })

    it('sollte den korrekten Content-Type für Versicherungsanfragen erkennen', () => {
      const results: SearchResult[] = [{
        url: 'test.com',
        title: 'Versicherungsinfo',
        content: 'Versicherungsinhalt',
        score: 0.9,
        metadata: {
          type: ContentTypeEnum.INSURANCE,
          title: 'Test'
        }
      }]

      const type = analyzer.determineResponseType('insurance_info', results)
      expect(type).toBe(ContentTypeEnum.INSURANCE)
    })

    it('sollte auf INFO zurückfallen, wenn kein spezifischer Typ erkannt wird', () => {
      const results: SearchResult[] = [{
        url: 'test.com',
        title: 'Allgemeine Info',
        content: 'Allgemeiner Inhalt',
        score: 0.9,
        metadata: {
          title: 'Test'
        }
      }]

      const type = analyzer.determineResponseType('unknown', results)
      expect(type).toBe(ContentTypeEnum.INFO)
    })
  })
}) 