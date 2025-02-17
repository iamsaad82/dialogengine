import { ABTestManager } from '../../../src/lib/testing/ABTestManager'
import { BaseHandler } from '../../../src/lib/handlers/BaseHandler'
import { MonitoringService } from '../../../src/lib/monitoring/monitoring'

// Test-Handler für verschiedene Antwortzeiten
class TimedHandler extends BaseHandler {
  private delay: number

  constructor(name: string, delay: number) {
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
    this.delay = delay
  }

  protected async search(query: string): Promise<any[]> {
    await new Promise(resolve => setTimeout(resolve, this.delay))
    return [{ test: `Antwort auf: ${query}` }]
  }
}

describe('A/B Testing Integration', () => {
  let abTestManager: ABTestManager
  let monitoring: MonitoringService
  let fastHandler: BaseHandler
  let slowHandler: BaseHandler

  beforeAll(() => {
    // Monitoring-Service initialisieren
    monitoring = new MonitoringService({
      serviceName: 'test-service',
      serviceVersion: '1.0.0'
    })

    // Handler mit verschiedenen Antwortzeiten
    fastHandler = new TimedHandler('fast', 50)  // 50ms Verzögerung
    slowHandler = new TimedHandler('slow', 200) // 200ms Verzögerung

    // A/B-Test-Manager initialisieren
    abTestManager = new ABTestManager()
    abTestManager.registerTest({
      testId: 'response-time-test',
      variants: {
        fast: {
          handler: fastHandler,
          weight: 50
        },
        slow: {
          handler: slowHandler,
          weight: 50
        }
      },
      metrics: ['success_rate', 'latency']
    })
  })

  it('sollte den kompletten A/B-Test-Workflow durchführen', async () => {
    const testUsers = ['user-1', 'user-2', 'user-3', 'user-4']
    const results: Array<{ userId: string, latency: number }> = []

    // Simuliere mehrere Benutzeranfragen
    for (const userId of testUsers) {
      const handler = abTestManager.selectVariant('response-time-test', userId)
      
      const startTime = Date.now()
      await handler.handleSearch('test query')
      const latency = (Date.now() - startTime) / 1000

      results.push({ userId, latency })

      // Metriken aufzeichnen
      const metrics = {
        success_rate: 1,
        latency
      }

      console.log('Zeichne Metriken auf:', {
        testId: 'response-time-test',
        variantId: handler.getType(),
        metrics
      })

      // Metriken in beiden Systemen aufzeichnen
      abTestManager.recordMetrics('response-time-test', handler.getType(), metrics)
      monitoring.recordABTestMetrics('response-time-test', handler.getType(), metrics)

      // Metriken sofort nach der Aufzeichnung überprüfen
      const currentMetrics = await monitoring.getMetrics()
      console.log('Aktuelle Metriken nach Aufzeichnung:', currentMetrics)
    }

    // Ergebnisse abrufen und validieren
    const testResults = abTestManager.getTestResults('response-time-test')
    
    // Prüfen, ob beide Varianten verwendet wurden
    expect(testResults.length).toBe(2)
    
    // Prüfen, ob die Metriken aufgezeichnet wurden
    for (const result of testResults) {
      expect(result.metrics.success_rate).toBeDefined()
      expect(result.metrics.latency).toBeDefined()
      expect(result.sampleSize).toBeGreaterThan(0)
    }

    // Prometheus-Metriken abrufen und validieren
    const metrics = await monitoring.getMetrics()
    console.log('Finale Metriken:', metrics)

    // Überprüfe die Metrik-Struktur
    expect(metrics).toContain('abtest_metrics')
    expect(metrics).toContain('test_id="response-time-test"')
  })

  it('sollte konsistente Varianten-Zuweisung über mehrere Anfragen gewährleisten', async () => {
    const userId = 'consistent-user'
    const iterations = 5
    const selectedVariant = abTestManager.selectVariant('response-time-test', userId)
    
    for (let i = 0; i < iterations; i++) {
      const variant = abTestManager.selectVariant('response-time-test', userId)
      expect(variant).toBe(selectedVariant)
      
      const result = await variant.handleSearch('test query')
      expect(result).toBeDefined()
    }
  })

  it('sollte Metriken korrekt aggregieren', async () => {
    const testId = 'aggregation-test'
    const variantId = 'test-variant'
    
    // Neuen Test für Aggregation registrieren
    abTestManager.registerTest({
      testId,
      variants: {
        [variantId]: {
          handler: fastHandler,
          weight: 100
        }
      },
      metrics: ['value']
    })

    // Mehrere Metriken aufzeichnen
    const values = [1, 2, 3, 4, 5]
    for (const value of values) {
      // Metriken in beiden Systemen aufzeichnen
      abTestManager.recordMetrics(testId, variantId, { value })
      monitoring.recordABTestMetrics(testId, variantId, { value })
    }

    // Ergebnisse prüfen
    const results = abTestManager.getTestResults(testId)
    const variantResult = results.find(r => r.variant === variantId)

    expect(variantResult).toBeDefined()
    expect(variantResult?.sampleSize).toBe(values.length)
    expect(variantResult?.metrics.value).toBe(3) // Durchschnitt von 1-5
  })
}) 