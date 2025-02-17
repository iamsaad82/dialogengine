import { MonitoringService } from '../../../src/lib/monitoring/monitoring'

describe('MonitoringService', () => {
  let monitoringService: MonitoringService

  beforeEach(() => {
    monitoringService = new MonitoringService({
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      labels: {
        environment: 'test',
        region: 'eu'
      },
      collectDefaultMetrics: true
    })
  })

  it('sollte korrekt mit zusätzlichen Labels umgehen', async () => {
    monitoringService.recordHandlerCall('test-handler', true)
    const metrics = await monitoringService.getMetrics()
    expect(metrics).toContain('service="test-service"')
    expect(metrics).toContain('version="1.0.0"')
    expect(metrics).toContain('environment="test"')
    expect(metrics).toContain('region="eu"')
  })

  it('sollte korrekte Metriken für verschiedene Aktionen aufzeichnen', async () => {
    monitoringService.recordHandlerCall('test-handler', true)
    monitoringService.recordSearchRequest('success', 'test-handler')
    monitoringService.recordError('test-error', '404')
    
    const metrics = await monitoringService.getMetrics()
    expect(metrics).toContain('handler_calls_total')
    expect(metrics).toContain('search_requests_total')
    expect(metrics).toContain('error_rate_total')
  })

  it('sollte Handler-Aufrufe aufzeichnen', async () => {
    monitoringService.recordHandlerCall('test-handler', true)
    
    const metrics = await monitoringService.getMetrics()
    expect(metrics).toContain('handler_calls_total')
  })

  describe('Handler-Metriken', () => {
    it('sollte Handler-Aufrufe korrekt aufzeichnen', async () => {
      monitoringService.recordHandlerCall('test-handler', true)
      monitoringService.recordHandlerCall('test-handler', false)

      const metrics = await monitoringService.getMetrics()
      expect(metrics).toContain('handler_calls_total')
      expect(metrics).toContain('handler_name="test-handler"')
      expect(metrics).toContain('status="success"')
      expect(metrics).toContain('status="error"')
    })

    it('sollte Handler-Latenz korrekt aufzeichnen', async () => {
      monitoringService.recordHandlerLatency('test-handler', 0.5)

      const metrics = await monitoringService.getMetrics()
      expect(metrics).toContain('handler_latency_seconds')
      expect(metrics).toContain('handler_name="test-handler"')
    })
  })

  describe('A/B-Test-Metriken', () => {
    it('sollte A/B-Test-Metriken korrekt aufzeichnen', async () => {
      const testMetrics = {
        clicks: 10,
        conversions: 5
      }

      monitoringService.recordABTestMetrics('test-1', 'variant-a', testMetrics)

      const metrics = await monitoringService.getMetrics()
      expect(metrics).toContain('abtest_metrics')
      expect(metrics).toContain('test_id="test-1"')
      expect(metrics).toContain('variant_id="variant-a"')
      expect(metrics).toContain('metric_name="clicks"')
      expect(metrics).toContain('metric_name="conversions"')
    })
  })

  describe('Such-Metriken', () => {
    it('sollte Such-Anfragen korrekt aufzeichnen', async () => {
      monitoringService.recordSearchRequest('success', 'test-handler')

      const metrics = await monitoringService.getMetrics()
      expect(metrics).toContain('search_requests_total')
      expect(metrics).toContain('request_status="success"')
      expect(metrics).toContain('handler_name="test-handler"')
    })

    it('sollte Such-Latenz korrekt aufzeichnen', async () => {
      monitoringService.recordSearchLatency(0.3, 'test-handler')

      const metrics = await monitoringService.getMetrics()
      expect(metrics).toContain('search_latency_seconds')
      expect(metrics).toContain('handler_name="test-handler"')
    })
  })

  describe('Fehler-Metriken', () => {
    it('sollte Fehler korrekt aufzeichnen', async () => {
      monitoringService.recordError('validation', '400')

      const metrics = await monitoringService.getMetrics()
      expect(metrics).toContain('error_rate_total')
      expect(metrics).toContain('error_type="validation"')
      expect(metrics).toContain('error_code="400"')
    })
  })

  describe('Cache-Metriken', () => {
    it('sollte Cache-Hit-Ratio korrekt aufzeichnen', async () => {
      monitoringService.updateCacheHitRatio(0.75, 'local')

      const metrics = await monitoringService.getMetrics()
      expect(metrics).toContain('cache_hit_ratio')
      expect(metrics).toContain('cache_type="local"')
    })
  })

  describe('Verbindungs-Metriken', () => {
    it('sollte aktive Verbindungen korrekt aufzeichnen', async () => {
      monitoringService.updateActiveConnections(5)

      const metrics = await monitoringService.getMetrics()
      expect(metrics).toContain('active_connections')
    })
  })

  describe('Fehlerbehandlung', () => {
    it('sollte Fehler bei der Metrik-Aufzeichnung abfangen', () => {
      const consoleSpy = jest.spyOn(console, 'error')
      
      // Simuliere einen Fehler durch ungültige Labels
      monitoringService.recordHandlerCall('', true)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Fehler beim Aufzeichnen des Handler-Aufrufs:',
        expect.any(Error)
      )
      consoleSpy.mockRestore()
    })
  })
}) 