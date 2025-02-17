import { Registry, Counter, Gauge, Histogram } from 'prom-client'

interface ClientMonitoringConfig {
  serviceName: string
  serviceVersion: string
}

interface MetricValue {
  value: number
  timestamp: number
  labels: Record<string, string>
}

class MetricCollector {
  private values: MetricValue[] = []

  record(value: number, labels: Record<string, string> = {}) {
    this.values.push({
      value,
      timestamp: Date.now(),
      labels
    })
  }

  increment(labels: Record<string, string> = {}) {
    this.record(1, labels)
  }

  observe(value: number, labels: Record<string, string> = {}) {
    this.record(value, labels)
  }

  set(value: number, labels: Record<string, string> = {}) {
    this.record(value, labels)
  }

  getValues(): MetricValue[] {
    return this.values
  }

  clear(): void {
    this.values = []
  }
}

export class ClientMonitoringService {
  private readonly config: ClientMonitoringConfig
  private readonly searchRequests: MetricCollector
  private readonly searchLatency: MetricCollector
  private readonly cacheHitRatio: MetricCollector
  private readonly errorRate: MetricCollector
  private readonly handlerUsage: MetricCollector

  constructor(config: ClientMonitoringConfig) {
    this.config = config
    this.searchRequests = new MetricCollector()
    this.searchLatency = new MetricCollector()
    this.cacheHitRatio = new MetricCollector()
    this.errorRate = new MetricCollector()
    this.handlerUsage = new MetricCollector()

    // Metriken regelmäßig an den Server senden
    if (typeof window !== 'undefined') {
      setInterval(() => this.sendMetricsToServer(), 30000)
    }
  }

  private getDefaultLabels(): Record<string, string> {
    return {
      service: this.config.serviceName,
      version: this.config.serviceVersion
    }
  }

  // Such-Anfrage aufzeichnen
  public recordSearchRequest(status: 'success' | 'error', handlerType: string): void {
    try {
      this.searchRequests.increment({
        ...this.getDefaultLabels(),
        status,
        handler_type: handlerType
      })
      console.debug('Search request recorded:', { status, handlerType })
    } catch (error) {
      console.error('Fehler beim Aufzeichnen der Such-Anfrage:', error)
    }
  }

  // Latenz aufzeichnen
  public recordSearchLatency(duration: number, handlerType: string): void {
    try {
      this.searchLatency.observe(duration, {
        ...this.getDefaultLabels(),
        handler_type: handlerType
      })
      console.debug('Search latency recorded:', { duration, handlerType })
    } catch (error) {
      console.error('Fehler beim Aufzeichnen der Latenz:', error)
    }
  }

  // Cache Hit Ratio aktualisieren
  public updateCacheHitRatio(ratio: number, cacheType: 'local' | 'redis'): void {
    try {
      this.cacheHitRatio.set(ratio, {
        ...this.getDefaultLabels(),
        cache_type: cacheType
      })
      console.debug('Cache hit ratio updated:', { ratio, cacheType })
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Cache-Hit-Ratio:', error)
    }
  }

  // Fehler aufzeichnen
  public recordError(type: string, code: string): void {
    try {
      this.errorRate.increment({
        ...this.getDefaultLabels(),
        type,
        code
      })
      console.debug('Error recorded:', { type, code })
    } catch (error) {
      console.error('Fehler beim Aufzeichnen des Fehlers:', error)
    }
  }

  // Handler-Nutzung aufzeichnen
  public recordHandlerUsage(handlerType: string, status: 'success' | 'error'): void {
    try {
      this.handlerUsage.increment({
        ...this.getDefaultLabels(),
        handler_type: handlerType,
        status
      })
      console.debug('Handler usage recorded:', { handlerType, status })
    } catch (error) {
      console.error('Fehler beim Aufzeichnen der Handler-Nutzung:', error)
    }
  }

  // Metriken an den Server senden
  private async sendMetricsToServer(): Promise<void> {
    try {
      const metrics = {
        searchRequests: this.searchRequests.getValues(),
        searchLatency: this.searchLatency.getValues(),
        cacheHitRatio: this.cacheHitRatio.getValues(),
        errorRate: this.errorRate.getValues(),
        handlerUsage: this.handlerUsage.getValues(),
        timestamp: Date.now(),
        client: {
          service: this.config.serviceName,
          version: this.config.serviceVersion
        }
      }

      console.debug('Sende Metriken an Server:', {
        timestamp: new Date().toISOString(),
        metricCount: {
          searchRequests: metrics.searchRequests.length,
          searchLatency: metrics.searchLatency.length,
          cacheHitRatio: metrics.cacheHitRatio.length,
          errorRate: metrics.errorRate.length,
          handlerUsage: metrics.handlerUsage.length
        }
      })

      const response = await fetch('/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metrics)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Erfolgreich gesendete Metriken löschen
      this.clearMetrics()
      
      console.debug('Metriken erfolgreich gesendet und gelöscht')
    } catch (error) {
      console.error('Fehler beim Senden der Metriken:', error)
    }
  }

  // Metriken nach erfolgreicher Übertragung löschen
  private clearMetrics(): void {
    this.searchRequests.clear()
    this.searchLatency.clear()
    this.cacheHitRatio.clear()
    this.errorRate.clear()
    this.handlerUsage.clear()
  }

  // Metriken als JSON abrufen
  public getMetricsAsJson(): object {
    return {
      searchRequests: this.searchRequests.getValues(),
      searchLatency: this.searchLatency.getValues(),
      cacheHitRatio: this.cacheHitRatio.getValues(),
      errorRate: this.errorRate.getValues(),
      handlerUsage: this.handlerUsage.getValues()
    }
  }
} 