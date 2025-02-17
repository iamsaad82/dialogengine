import express from 'express'
import { MonitoringService } from './monitoring'

interface MetricsServerConfig {
  port: number
  path?: string
  monitoring: MonitoringService
}

export class MetricsServer {
  private readonly app: express.Application
  private readonly monitoring: MonitoringService
  private readonly port: number
  private readonly metricsPath: string

  constructor(config: MetricsServerConfig) {
    this.app = express()
    this.monitoring = config.monitoring
    this.port = config.port
    this.metricsPath = config.path || '/metrics'

    this.setupRoutes()
  }

  private setupRoutes(): void {
    // Gesundheits-Check-Endpunkt
    this.app.get('/health', (_, res) => {
      res.status(200).json({ status: 'healthy' })
    })

    // Prometheus Metriken-Endpunkt
    this.app.get(this.metricsPath, async (_, res) => {
      try {
        const metrics = await this.monitoring.getMetrics()
        res.set('Content-Type', 'text/plain')
        res.send(metrics)
      } catch (error) {
        console.error('Fehler beim Abrufen der Metriken:', error)
        res.status(500).send('Fehler beim Abrufen der Metriken')
      }
    })

    // JSON Metriken-Endpunkt für interne Verwendung
    this.app.get('/metrics/json', async (_, res) => {
      try {
        const metrics = await this.monitoring.getMetricsAsJson()
        res.json(metrics)
      } catch (error) {
        console.error('Fehler beim Abrufen der JSON-Metriken:', error)
        res.status(500).json({ error: 'Fehler beim Abrufen der Metriken' })
      }
    })
  }

  public start(): void {
    this.app.listen(this.port, () => {
      console.log(`Metrics-Server läuft auf Port ${this.port}`)
    })
  }
} 