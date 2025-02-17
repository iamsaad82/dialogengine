interface MonitoringConfig {
  serviceName: string
  serviceVersion: string
  labels?: Record<string, string>
}

interface MetricLabels {
  type: string
  status: string
  [key: string]: string
}

export class MonitoringService {
  private readonly config: MonitoringConfig
  private metrics: {
    latency: number[]
    cacheHits: { [key: string]: number }
    cacheMisses: { [key: string]: number }
    activeConnections: number
    errors: { [key: string]: number }
    handlerUsage: { [key: string]: { success: number; error: number } }
  }

  constructor(config: MonitoringConfig) {
    this.config = config
    this.metrics = {
      latency: [],
      cacheHits: {},
      cacheMisses: {},
      activeConnections: 0,
      errors: {},
      handlerUsage: {}
    }
  }

  public recordSearchLatency(duration: number, type: string): void {
    this.metrics.latency.push(duration)
    this.logMetric('search_latency', {
      type,
      value: duration.toString(),
      status: 'success'
    })
  }

  public recordSearchRequest(status: 'success' | 'error', type: string): void {
    this.logMetric('search_request', {
      type,
      status
    })
  }

  public recordError(type: string, error: unknown): void {
    this.metrics.errors[type] = (this.metrics.errors[type] || 0) + 1
    this.logMetric('error', {
      type,
      status: 'error',
      message: error instanceof Error ? error.message : 'unknown'
    })
  }

  public updateCacheHitRatio(hit: number, type: string): void {
    if (hit === 1) {
      this.metrics.cacheHits[type] = (this.metrics.cacheHits[type] || 0) + 1
    } else {
      this.metrics.cacheMisses[type] = (this.metrics.cacheMisses[type] || 0) + 1
    }

    this.logMetric('cache_hit_ratio', {
      type,
      status: hit === 1 ? 'hit' : 'miss'
    })
  }

  public recordHandlerUsage(handlerName: string, status: 'success' | 'error'): void {
    if (!this.metrics.handlerUsage[handlerName]) {
      this.metrics.handlerUsage[handlerName] = { success: 0, error: 0 }
    }

    if (status === 'success') {
      this.metrics.handlerUsage[handlerName].success++
    } else {
      this.metrics.handlerUsage[handlerName].error++
    }

    this.logMetric('handler_usage', {
      type: handlerName,
      status
    })
  }

  public updateActiveConnections(count: number): void {
    this.metrics.activeConnections = count
    this.logMetric('active_connections', {
      type: 'connections',
      status: 'active',
      count: count.toString()
    })
  }

  private logMetric(name: string, labels: MetricLabels): void {
    // Füge Standard-Labels hinzu
    const enrichedLabels = {
      ...labels,
      service: this.config.serviceName,
      version: this.config.serviceVersion,
      ...this.config.labels
    }

    // Log-Format für Entwicklung
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Metric] ${name}:`, enrichedLabels)
      return
    }

    // In Produktion könnten hier verschiedene Monitoring-Systeme angebunden werden
    // z.B. Prometheus, CloudWatch, etc.
  }

  public getMetrics() {
    return {
      ...this.metrics,
      averageLatency: this.calculateAverageLatency(),
      cacheHitRatio: this.calculateCacheHitRatio(),
      totalErrors: Object.values(this.metrics.errors).reduce((a, b) => a + b, 0),
      handlerStats: this.calculateHandlerStats()
    }
  }

  private calculateAverageLatency(): number {
    if (this.metrics.latency.length === 0) return 0
    const sum = this.metrics.latency.reduce((a, b) => a + b, 0)
    return sum / this.metrics.latency.length
  }

  private calculateCacheHitRatio(): Record<string, number> {
    const ratio: Record<string, number> = {}
    const types = new Set([
      ...Object.keys(this.metrics.cacheHits),
      ...Object.keys(this.metrics.cacheMisses)
    ])

    for (const type of types) {
      const hits = this.metrics.cacheHits[type] || 0
      const misses = this.metrics.cacheMisses[type] || 0
      const total = hits + misses
      ratio[type] = total > 0 ? hits / total : 0
    }

    return ratio
  }

  private calculateHandlerStats() {
    return Object.entries(this.metrics.handlerUsage).map(([name, stats]) => ({
      name,
      successRate: stats.success / (stats.success + stats.error),
      totalCalls: stats.success + stats.error,
      ...stats
    }))
  }
} 