import { Registry, Counter, Histogram, Gauge } from 'prom-client'
import { collectDefaultMetrics } from 'prom-client'

interface MonitoringConfig {
  serviceName: string
  serviceVersion: string
  labels?: Record<string, string>
  collectDefaultMetrics?: boolean
}

interface MetricLabels {
  [key: string]: string | number
}

export class MonitoringService {
  private readonly registry: Registry
  private readonly handlerCalls: Counter<string>
  private readonly handlerLatency: Histogram<string>
  private readonly abTestMetrics: Gauge<string>
  private readonly searchRequests: Counter<string>
  private readonly searchLatency: Histogram<string>
  private readonly errorRate: Counter<string>
  private readonly cacheHitRatio: Gauge<string>
  private readonly activeConnections: Gauge<string>
  private readonly documentProcessing: Counter<string>
  private readonly documentProcessingLatency: Histogram<string>
  private readonly indexingSuccess: Counter<string>
  private readonly processingErrors: Counter<string>
  private readonly userFeedback: Gauge<string>

  constructor(config: MonitoringConfig) {
    this.registry = new Registry()

    // Basis-Labels für alle Metriken
    const defaultLabels: MetricLabels = {
      service: config.serviceName,
      version: config.serviceVersion,
      ...config.labels
    }
    this.registry.setDefaultLabels(defaultLabels)

    if (config.collectDefaultMetrics) {
      collectDefaultMetrics({ register: this.registry })
    }

    // Handler-Aufrufe
    this.handlerCalls = new Counter({
      name: 'handler_calls_total',
      help: 'Anzahl der Handler-Aufrufe',
      labelNames: ['handler_name', 'status'],
      registers: [this.registry]
    })

    // Handler-Latenz
    this.handlerLatency = new Histogram({
      name: 'handler_latency_seconds',
      help: 'Antwortzeit der Handler in Sekunden',
      labelNames: ['handler_name'],
      buckets: [0.1, 0.5, 1, 2, 5],
      registers: [this.registry]
    })

    // A/B-Test-Metriken
    this.abTestMetrics = new Gauge({
      name: 'abtest_metrics',
      help: 'A/B-Test-Metriken',
      labelNames: ['test_id', 'variant_id', 'metric_name'],
      registers: [this.registry]
    })

    // Such-Anfragen
    this.searchRequests = new Counter({
      name: 'search_requests_total',
      help: 'Anzahl der Suchanfragen',
      labelNames: ['request_status', 'handler_name'],
      registers: [this.registry]
    })

    // Such-Latenz
    this.searchLatency = new Histogram({
      name: 'search_latency_seconds',
      help: 'Antwortzeit der Suche in Sekunden',
      labelNames: ['handler_name'],
      buckets: [0.1, 0.5, 1, 2, 5],
      registers: [this.registry]
    })

    // Fehlerrate
    this.errorRate = new Counter({
      name: 'error_rate_total',
      help: 'Anzahl der Fehler',
      labelNames: ['error_type', 'error_code'],
      registers: [this.registry]
    })

    // Cache Hit Ratio
    this.cacheHitRatio = new Gauge({
      name: 'cache_hit_ratio',
      help: 'Cache Hit Ratio',
      labelNames: ['cache_type'],
      registers: [this.registry]
    })

    // Aktive Verbindungen
    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Anzahl aktiver Verbindungen',
      registers: [this.registry]
    })

    // Neue Metriken für Dokumentenverarbeitung
    this.documentProcessing = new Counter({
      name: 'document_processing_total',
      help: 'Anzahl der verarbeiteten Dokumente',
      labelNames: ['template_id', 'stage', 'status'],
      registers: [this.registry]
    })

    this.documentProcessingLatency = new Histogram({
      name: 'document_processing_duration_seconds',
      help: 'Dauer der Dokumentenverarbeitung',
      labelNames: ['template_id', 'stage'],
      registers: [this.registry]
    })

    this.indexingSuccess = new Counter({
      name: 'document_indexing_success_total',
      help: 'Erfolgreich indexierte Dokumente',
      labelNames: ['template_id'],
      registers: [this.registry]
    })

    this.processingErrors = new Counter({
      name: 'document_processing_errors_total',
      help: 'Fehler bei der Dokumentenverarbeitung',
      labelNames: ['template_id', 'stage', 'error_type'],
      registers: [this.registry]
    })

    // User Feedback
    this.userFeedback = new Gauge({
      name: 'user_feedback_rating',
      help: 'Benutzer-Feedback-Bewertung',
      labelNames: ['handler_id', 'template_id'],
      registers: [this.registry]
    })
  }

  // Handler-Aufruf aufzeichnen
  public recordHandlerCall(handlerName: string, success: boolean): void {
    if (!handlerName) {
      const error = new Error('Handler-Name darf nicht leer sein')
      console.error('Fehler beim Aufzeichnen des Handler-Aufrufs:', error)
      return
    }

    try {
      const labels: MetricLabels = {
        handler_name: handlerName,
        status: success ? 'success' : 'error'
      }
      this.handlerCalls.inc(labels)
    } catch (error) {
      console.error('Fehler beim Aufzeichnen des Handler-Aufrufs:', error)
    }
  }

  // Handler-Latenz aufzeichnen
  public recordHandlerLatency(duration: number) {
    if (this.handlerLatency) {
      this.handlerLatency.observe({}, duration)
    }
  }

  // A/B-Test-Metriken aufzeichnen
  public recordABTestMetrics(testId: string, variantId: string, metrics: Record<string, number>): void {
    try {
      Object.entries(metrics).forEach(([metricName, value]) => {
        const labels: MetricLabels = {
          test_id: testId,
          variant_id: variantId,
          metric_name: metricName
        }
        this.abTestMetrics.set(labels, value)
      })
    } catch (error) {
      console.error('Fehler beim Aufzeichnen der A/B-Test-Metriken:', error)
    }
  }

  // Such-Anfrage aufzeichnen
  public recordSearchRequest(status: 'success' | 'error', handlerName: string): void {
    try {
      const labels: MetricLabels = {
        request_status: status,
        handler_name: handlerName
      }
      this.searchRequests.inc(labels)
    } catch (error) {
      console.error('Fehler beim Aufzeichnen der Such-Anfrage:', error)
    }
  }

  // Such-Latenz aufzeichnen
  public recordSearchLatency(duration: number, handlerName: string): void {
    try {
      const labels: MetricLabels = {
        handler_name: handlerName
      }
      this.searchLatency.observe(labels, duration)
    } catch (error) {
      console.error('Fehler beim Aufzeichnen der Such-Latenz:', error)
    }
  }

  // Fehler aufzeichnen
  public recordError(errorType: string, errorCode: string): void {
    try {
      const labels: MetricLabels = {
        error_type: errorType,
        error_code: errorCode
      }
      this.errorRate.inc(labels)
    } catch (error) {
      console.error('Fehler beim Aufzeichnen des Fehlers:', error)
    }
  }

  // Cache Hit Ratio aktualisieren
  public updateCacheHitRatio(ratio: number, cacheType: string): void {
    try {
      const labels: MetricLabels = {
        cache_type: cacheType
      }
      this.cacheHitRatio.set(labels, ratio)
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Cache-Hit-Ratio:', error)
    }
  }

  // Aktive Verbindungen aktualisieren
  public updateActiveConnections(count: number): void {
    try {
      this.activeConnections.set({}, count)
    } catch (error) {
      console.error('Fehler beim Aktualisieren der aktiven Verbindungen:', error)
    }
  }

  // Metriken abrufen
  public async getMetrics(): Promise<string> {
    try {
      const metrics = await this.registry.metrics()
      console.debug('Generierte Metriken:', metrics)
      return metrics
    } catch (error) {
      console.error('Fehler beim Abrufen der Metriken:', error)
      return ''
    }
  }

  // Handler-Nutzung aufzeichnen
  public recordHandlerUsage(handlerName: string, status: 'success' | 'error'): void {
    this.recordHandlerCall(handlerName, status === 'success')
  }

  // Neue Methoden für Dokumentenverarbeitung
  public recordDocumentProcessing(templateId: string, stage: string, success: boolean): void {
    this.documentProcessing.labels({ template_id: templateId, stage, status: success ? 'success' : 'error' }).inc()
  }

  public recordDocumentProcessingLatency(templateId: string, stage: string, durationInSeconds: number): void {
    this.documentProcessingLatency.labels({ template_id: templateId, stage }).observe(durationInSeconds)
  }

  public recordIndexingSuccess(templateId: string): void {
    this.indexingSuccess.labels({ template_id: templateId }).inc()
  }

  public recordProcessingError(templateId: string, stage: string, errorType: string): void {
    this.processingErrors.labels({ template_id: templateId, stage, error_type: errorType }).inc()
  }

  public recordUserFeedback(handlerId: string, rating: number, templateId: string): void {
    try {
      const labels: MetricLabels = {
        handler_id: handlerId,
        template_id: templateId
      }
      this.userFeedback.set(labels, rating)
    } catch (error) {
      console.error('Fehler beim Aufzeichnen des Benutzer-Feedbacks:', error)
    }
  }

  recordEvent(eventName: string, data: Record<string, any>): void {
    console.log(`[Monitoring] Event: ${eventName}`, data);
    // Hier kann später die tatsächliche Event-Aufzeichnung implementiert werden
  }
} 