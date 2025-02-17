import { ContentTypeDetector } from '../../src/lib/services/contentTypeDetector'
import { createMockOpenAI } from './services/search/core/test-utils'
import { ContentTypes } from '../../src/lib/types/content'

describe('ContentTypeDetector', () => {
  let detector: ContentTypeDetector
  let mockOpenAI: any

  beforeEach(() => {
    mockOpenAI = createMockOpenAI()
    detector = new ContentTypeDetector(mockOpenAI)
  })

  describe('detect', () => {
    it('sollte den Unternehmens-Typ erkennen', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              type: ContentTypes.INFO,
              confidence: 0.9
            })
          }
        }]
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse)

      const result = await detector.detect({
        text: 'Wir sind ein innovatives Unternehmen...',
        title: 'Über uns',
        url: 'https://example.com/about'
      })

      expect(result.type).toBe(ContentTypes.INFO)
      expect(result.confidence).toBe(0.9)
    })

    it('sollte auf INFO zurückfallen bei unklarem Content', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              type: ContentTypes.INFO,
              confidence: 0.5
            })
          }
        }]
      }

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse)

      const result = await detector.detect({
        text: 'Unklarer Content...',
        title: 'Test',
        url: 'https://example.com/test'
      })

      expect(result.type).toBe(ContentTypes.INFO)
      expect(result.confidence).toBe(0.5)
    })

    it('sollte mit API-Fehlern umgehen können', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'))

      const result = await detector.detect({
        text: 'Test Content',
        title: 'Test',
        url: 'https://example.com/error'
      })

      expect(result.type).toBe(ContentTypes.INFO)
      expect(result.confidence).toBe(0)
    })

    it('sollte mehrere Dokumente parallel analysieren können', async () => {
      const mockResponses = [
        {
          choices: [{
            message: {
              content: JSON.stringify({
                type: ContentTypes.INFO,
                confidence: 0.8
              })
            }
          }]
        },
        {
          choices: [{
            message: {
              content: JSON.stringify({
                type: ContentTypes.SERVICE,
                confidence: 0.9
              })
            }
          }]
        }
      ]

      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])

      const docs = [
        { text: 'Info Text', title: 'Info 1', url: 'https://example.com/info' },
        { text: 'Service Text', title: 'Service 1', url: 'https://example.com/service' }
      ]

      const results = await detector.detectBatch(docs)

      expect(results).toHaveLength(2)
      expect(results[0].type).toBe(ContentTypes.INFO)
      expect(results[1].type).toBe(ContentTypes.SERVICE)
    })
  })

  it('sollte den Content-Type korrekt erkennen', async () => {
    const result = await detector.detectType('Dies ist ein Informationstext')
    expect(result.type).toBe(ContentTypes.INFO)
    expect(result.confidence).toBeGreaterThan(0.5)
  })
}) 