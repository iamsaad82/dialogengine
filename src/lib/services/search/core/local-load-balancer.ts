import { SearchConfig } from '../types'
import { MonitoringService } from '../../../monitoring/monitoring'

interface InstanceHealth {
  host: string
  port: number
  healthy: boolean
  lastCheck: Date
  errorCount: number
}

export class LocalLoadBalancer {
  private readonly config: SearchConfig
  private readonly monitoring?: MonitoringService
  private readonly maxErrors = 3
  private instanceHealth: InstanceHealth

  constructor(config: SearchConfig, monitoring?: MonitoringService) {
    this.config = config
    this.monitoring = monitoring
    this.instanceHealth = {
      host: config.host || 'localhost',
      port: config.port || 3000,
      healthy: true,
      lastCheck: new Date(),
      errorCount: 0
    }
  }

  public async selectInstance(): Promise<{ host: string; port: number } | null> {
    try {
      // Prüfe den Gesundheitszustand
      if (!this.instanceHealth.healthy) {
        if (this.monitoring) {
          this.monitoring.recordError('load-balancer', 'Instanz nicht verfügbar')
        }
        return null
      }

      // Aktualisiere den Zeitstempel
      this.instanceHealth.lastCheck = new Date()

      if (this.monitoring) {
        this.monitoring.updateActiveConnections(1)
      }

      return {
        host: this.instanceHealth.host,
        port: this.instanceHealth.port
      }
    } catch (error) {
      if (this.monitoring) {
        this.monitoring.recordError('load-balancer', 'Fehler bei der Instanzauswahl')
      }
      return null
    }
  }

  public async updateInstanceMetrics(success: boolean = true): Promise<void> {
    try {
      if (!success) {
        this.instanceHealth.errorCount++
        if (this.instanceHealth.errorCount >= this.maxErrors) {
          this.instanceHealth.healthy = false
          if (this.monitoring) {
            this.monitoring.recordError('load-balancer', 'Instanz als ungesund markiert')
          }
        }
      } else {
        // Setze Fehlerzähler zurück bei erfolgreicher Anfrage
        this.instanceHealth.errorCount = 0
        this.instanceHealth.healthy = true
      }

      if (this.monitoring) {
        this.monitoring.updateCacheHitRatio(
          this.instanceHealth.healthy ? 1 : 0,
          'instance-health'
        )
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Instanz-Metriken:', error)
    }
  }

  public async shutdown(): Promise<void> {
    try {
      if (this.monitoring) {
        this.monitoring.updateActiveConnections(0)
      }
      this.instanceHealth.healthy = false
    } catch (error) {
      console.error('Fehler beim Herunterfahren des LocalLoadBalancer:', error)
    }
  }

  // Getter für Tests und Monitoring
  public getInstanceHealth(): InstanceHealth {
    return { ...this.instanceHealth }
  }
} 