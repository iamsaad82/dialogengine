import { Registry, Counter, Gauge, Histogram } from 'prom-client'
import { Redis } from 'ioredis'
import os from 'os'
import { collectDefaultMetrics } from 'prom-client'

interface ServerMonitoringConfig {
  serviceName: string
  serviceVersion: string
  redis?: Redis
  collectDefaultMetrics?: boolean
}

export class ServerMonitoringService {
  private readonly registry: Registry
  private readonly cpuUsage: Gauge<string>
  private readonly memoryUsage: Gauge<string>
  private readonly activeConnections: Gauge<string>
  private readonly config: ServerMonitoringConfig
  private readonly defaultLabelNames: string[]
  private collectionInterval: NodeJS.Timeout | null = null

  constructor(config: ServerMonitoringConfig) {
    this.config = config
    this.registry = new Registry()
    this.defaultLabelNames = ['service', 'version']
    
    // CPU-Auslastung
    this.cpuUsage = new Gauge({
      name: 'cpu_usage_percent',
      help: 'CPU-Auslastung in Prozent',
      labelNames: this.defaultLabelNames,
      registers: [this.registry]
    })

    // Speicherauslastung
    this.memoryUsage = new Gauge({
      name: 'memory_usage_percent',
      help: 'Speicherauslastung in Prozent',
      labelNames: this.defaultLabelNames,
      registers: [this.registry]
    })

    // Aktive Verbindungen
    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Anzahl aktiver Verbindungen',
      labelNames: this.defaultLabelNames,
      registers: [this.registry]
    })

    if (config.collectDefaultMetrics) {
      collectDefaultMetrics({ register: this.registry })
    }

    this.startMetricsCollection()
  }

  private getDefaultLabelValues(): string[] {
    return [
      this.config.serviceName,
      this.config.serviceVersion
    ]
  }

  private startMetricsCollection(): void {
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics()
    }, 15000)
  }

  private collectSystemMetrics(): void {
    try {
      const labelValues = this.getDefaultLabelValues()

      // CPU-Auslastung (1-Minuten-Load durchschnittlich)
      const loadAvg = os.loadavg()[0]
      const cpuCount = os.cpus().length
      const cpuUsagePercent = (loadAvg / cpuCount) * 100
      this.cpuUsage.labels(...labelValues).set(cpuUsagePercent)

      // Speicherauslastung
      const totalMem = os.totalmem()
      const freeMem = os.freemem()
      const usedMemPercent = ((totalMem - freeMem) / totalMem) * 100
      this.memoryUsage.labels(...labelValues).set(usedMemPercent)

      // Aktive Verbindungen
      const activeConnections = this.getActiveConnections()
      this.activeConnections.labels(...labelValues).set(activeConnections)

      console.debug('System-Metriken aktualisiert:', {
        cpu: {
          loadAvg,
          cpuCount,
          usagePercent: cpuUsagePercent
        },
        memory: {
          total: totalMem,
          free: freeMem,
          usagePercent: usedMemPercent
        },
        connections: activeConnections
      })
    } catch (error) {
      console.error('Fehler beim Sammeln der System-Metriken:', error)
    }
  }

  private getActiveConnections(): number {
    return 0 // Implementierung für aktive Verbindungen
  }

  public cleanup(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval)
      this.collectionInterval = null
    }
  }

  public async getMetrics(): Promise<string> {
    return this.registry.metrics()
  }

  public async getMetricsAsJson(): Promise<object> {
    return this.registry.getMetricsAsJSON()
  }
} 