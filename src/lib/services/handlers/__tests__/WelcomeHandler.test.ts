import { WelcomeHandler } from '../WelcomeHandler'
import { HandlerContext } from '../base'
import { HandlerConfig } from '../types'

describe('WelcomeHandler', () => {
  let handler: WelcomeHandler
  let context: HandlerContext

  beforeEach(() => {
    context = {
      templateId: 'test-template',
      language: 'de'
    }

    const config: HandlerConfig = {
      type: 'welcome',
      name: 'WelcomeHandler',
      active: true,
      priority: 100,
      responseType: 'info',
      patterns: [
        '^(hallo|hi|hey|guten tag|servus|grüß gott|moin)',
        '^(wer bist du|was kannst du|wie funktionierst du)'
      ]
    }

    handler = new WelcomeHandler(context, config)
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
        confidence: 1.0,
        metadata: {
          handler: 'welcome',
          deprecated: true,
          replacement: 'DynamicHandler'
        }
      })
      expect(response.answer).toContain('Hallo!')
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
        confidence: 1.0,
        metadata: {
          handler: 'welcome',
          deprecated: true,
          replacement: 'DynamicHandler'
        }
      })
      expect(response.answer).toContain('TestTemplate-Assistent')
      expect(response.answer).toContain('speziell dafür entwickelt')
    })

    it('enthält Follow-up Vorschläge', async () => {
      const response = await handler.handle({ 
        query: 'hallo', 
        type: 'info',
        metadata: {
          template: { name: 'TestTemplate' }
        }
      })

      expect(response.metadata?.followup).toBeDefined()
      expect(response.metadata?.followup).toContain('Sie können mir zum Beispiel Fragen')
    })
  })
}) 