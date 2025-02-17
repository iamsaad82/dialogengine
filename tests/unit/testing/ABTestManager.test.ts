import { ABTestManager } from '../../../src/lib/testing/ABTestManager'
import { BaseHandler } from '../../../src/lib/handlers/BaseHandler'
import { eventCollector } from '../../../src/lib/monitoring/client-events'

// Mock für BaseHandler
class MockHandler extends BaseHandler {
  constructor(name: string) {
    super({
      type: name,
      searchFields: ['test'],
      responseTemplate: '{"response": "{{test}}"}',
      validationRules: {
        type: name,
        required: [],
        validation: {}
      }
    })
  }

  protected async search(): Promise<any[]> {
    return []
  }
}

// Mock für eventCollector
jest.mock('../../../src/lib/monitoring/client-events', () => ({
  eventCollector: {
    recordABTestMetrics: jest.fn()
  }
}))

describe('ABTestManager', () => {
  let manager: ABTestManager
  let controlHandler: BaseHandler
  let testHandler: BaseHandler

  beforeEach(() => {
    manager = new ABTestManager()
    controlHandler = new MockHandler('control')
    testHandler = new MockHandler('test')
    
    // Test-Konfiguration zurücksetzen
    manager.registerTest({
      testId: 'test-1',
      variants: {
        control: {
          handler: controlHandler,
          weight: 50
        },
        test: {
          handler: testHandler,
          weight: 50
        }
      },
      metrics: ['success_rate', 'latency']
    })

    // Mock zurücksetzen
    jest.clearAllMocks()
  })

  describe('registerTest', () => {
    it('sollte einen Test erfolgreich registrieren', () => {
      expect(() => {
        manager.registerTest({
          testId: 'test-2',
          variants: {
            a: { handler: controlHandler, weight: 50 },
            b: { handler: testHandler, weight: 50 }
          },
          metrics: ['metric1']
        })
      }).not.toThrow()
    })

    it('sollte einen Fehler werfen, wenn die Gewichte nicht 100 ergeben', () => {
      expect(() => {
        manager.registerTest({
          testId: 'invalid-test',
          variants: {
            a: { handler: controlHandler, weight: 40 },
            b: { handler: testHandler, weight: 40 }
          },
          metrics: ['metric1']
        })
      }).toThrow('Variant weights must sum to 100')
    })
  })

  describe('selectVariant', () => {
    it('sollte konsistent die gleiche Variante für den gleichen Benutzer zurückgeben', () => {
      const userId = 'user-1'
      const firstVariant = manager.selectVariant('test-1', userId)
      const secondVariant = manager.selectVariant('test-1', userId)
      expect(firstVariant).toBe(secondVariant)
    })

    it('sollte einen Fehler werfen für nicht existierende Tests', () => {
      expect(() => {
        manager.selectVariant('non-existent', 'user-1')
      }).toThrow('Test non-existent not found')
    })

    it('sollte verschiedene Varianten für verschiedene Benutzer zurückgeben', () => {
      const variants = new Set()
      for (let i = 0; i < 100; i++) {
        const variant = manager.selectVariant('test-1', `user-${i}`)
        variants.add(variant)
      }
      expect(variants.size).toBeGreaterThan(1)
    })
  })

  describe('recordMetrics', () => {
    it('sollte Metriken erfolgreich aufzeichnen', () => {
      const metrics = {
        success_rate: 1,
        latency: 0.5
      }

      manager.recordMetrics('test-1', 'test', metrics)

      expect(eventCollector.recordABTestMetrics).toHaveBeenCalledWith(
        'test-1',
        'test',
        metrics
      )
    })

    it('sollte einen Fehler werfen für nicht existierende Tests', () => {
      expect(() => {
        manager.recordMetrics('non-existent', 'test', { metric: 1 })
      }).toThrow('Test non-existent not found')
    })

    it('sollte den Durchschnitt korrekt berechnen', () => {
      // Erste Metrik
      manager.recordMetrics('test-1', 'test', { success_rate: 1 })
      
      // Zweite Metrik
      manager.recordMetrics('test-1', 'test', { success_rate: 3 })
      
      const results = manager.getTestResults('test-1')
      const testVariant = results.find(r => r.variant === 'test')
      
      expect(testVariant?.metrics.success_rate).toBe(2) // Durchschnitt von 1 und 3
      expect(testVariant?.sampleSize).toBe(2)
    })
  })

  describe('getTestResults', () => {
    it('sollte die Ergebnisse korrekt zurückgeben', () => {
      manager.recordMetrics('test-1', 'control', { success_rate: 1 })
      manager.recordMetrics('test-1', 'test', { success_rate: 2 })

      const results = manager.getTestResults('test-1')
      expect(results).toHaveLength(2)
      expect(results.map(r => r.variant)).toContain('control')
      expect(results.map(r => r.variant)).toContain('test')
    })

    it('sollte einen Fehler werfen für nicht existierende Tests', () => {
      expect(() => {
        manager.getTestResults('non-existent')
      }).toThrow('Test non-existent not found')
    })
  })
}) 