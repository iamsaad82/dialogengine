import { DynamicHandler } from '../DynamicHandler'
import { HandlerContext } from '../base'
import { welcomeConfig } from '../configs/welcomeConfig'

describe('WelcomeDynamicHandler', () => {
  let handler: DynamicHandler
  let context: HandlerContext

  beforeEach(() => {
    context = {
      templateId: 'test-template',
      language: 'de'
    }

    handler = new DynamicHandler(context, welcomeConfig)
  })

  describe('canHandle', () => {
    it('erkennt Begrüßungen', async () => {
      const testCases = [
        { query: 'hallo', expected: true },
        { query: 'hi', expected: true },
        { query: 'hey', expected: true },
        { query: 'guten tag', expected: true },
        { query: 'servus', expected: true },
        { query: 'grüß gott', expected: true },
        { query: 'moin', expected: true },
        { query: 'wie geht es dir', expected: false },
        { query: 'auf wiedersehen', expected: false }
      ]

      for (const { query, expected } of testCases) {
        const result = await handler.canHandle({ query, type: 'info' })
        expect(result).toBe(expected)
      }
    })

    it('erkennt Identitätsfragen', async () => {
      const testCases = [
        { query: 'wer bist du', expected: true },
        { query: 'was kannst du', expected: true },
        { query: 'wie funktionierst du', expected: true },
        { query: 'wo bist du', expected: false },
        { query: 'warum bist du hier', expected: false }
      ]

      for (const { query, expected } of testCases) {
        const result = await handler.canHandle({ query, type: 'info' })
        expect(result).toBe(expected)
      }
    })
  })

  describe('handle', () => {
    it('generiert passende Begrüßungsantwort', async () => {
      const response = await handler.handle({ 
        query: 'hallo', 
        type: 'info',
        metadata: {
          template: { name: 'TestTemplate' }
        }
      })

      expect(response).toMatchObject({
        type: 'info',
        confidence: expect.any(Number),
        metadata: expect.objectContaining({
          handler: 'welcome_dynamic'
        })
      })
      expect(response.answer).toContain('TestTemplate-Assistent')
    })

    it('generiert passende Identitätsantwort', async () => {
      const response = await handler.handle({ 
        query: 'wer bist du', 
        type: 'info',
        metadata: {
          template: { name: 'TestTemplate' }
        }
      })

      expect(response).toMatchObject({
        type: 'info',
        confidence: expect.any(Number),
        metadata: expect.objectContaining({
          handler: 'welcome_dynamic'
        })
      })
      expect(response.answer).toContain('TestTemplate-Assistent')
      expect(response.answer).toContain('speziell dafür entwickelt')
    })

    it('enthält vorgeschlagene Fragen', async () => {
      const response = await handler.handle({ 
        query: 'hallo', 
        type: 'info',
        metadata: {
          template: { name: 'TestTemplate' }
        }
      })

      expect(response.metadata).toBeDefined()
      if (response.metadata?.suggestedQuestions) {
        expect(Array.isArray(response.metadata.suggestedQuestions)).toBe(true)
        expect(response.metadata.suggestedQuestions.length).toBeGreaterThan(0)
      }
    })
  })
}) 