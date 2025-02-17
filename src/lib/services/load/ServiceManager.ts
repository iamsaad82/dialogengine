import { LoadBalancer } from './LoadBalancer'
import { SmartSearch } from '../search/core/search'
import { SearchConfig, SearchContext, SearchOptions, StructuredResponse } from '../search/types'
import { Redis } from 'ioredis'

interface ServiceManagerConfig {
  redis: Redis
  searchConfig: SearchConfig
  healthCheckInterval: number
  drainTimeout: number
  maxCpuThreshold: number
  maxMemoryThreshold: number
  maxConnectionsThreshold: number
  retryAttempts: number
  retryDelay: number
}

export class ServiceManager {
  private readonly loadBalancer: LoadBalancer
  private readonly config: ServiceManagerConfig
  private instanceId?: string

  constructor(config: ServiceManagerConfig) {
    this.config = config
    this.loadBalancer = new LoadBalancer(
      {
        redis: config.redis,
        healthCheckInterval: config.healthCheckInterval,
        drainTimeout: config.drainTimeout,
        maxCpuThreshold: config.maxCpuThreshold,
        maxMemoryThreshold: config.maxMemoryThreshold,
        maxConnectionsThreshold: config.maxConnectionsThreshold
      },
      config.searchConfig
    )
  }

  /**
   * Initialisiert diese Service-Instanz
   */
  async initialize(host: string, port: number): Promise<void> {
    this.instanceId = await this.loadBalancer.registerInstance(host, port)
    
    // Starte den SmartSearch Service
    const search = new SmartSearch(this.config.searchConfig)
    
    // Regelmäßige Metrik-Updates
    setInterval(async () => {
      const health = await search.getHealthStatus()
      if (this.instanceId) {
        await this.loadBalancer.updateInstanceMetrics(this.instanceId, {
          cpuUsage: health.metrics.cpuUsage,
          memoryUsage: health.metrics.memoryUsage.percentUsed,
          activeConnections: health.metrics.activeConnections,
          lastUpdate: new Date()
        })
      }
    }, 5000) // Alle 5 Sekunden
  }

  /**
   * Führt eine Suchanfrage mit automatischem Load Balancing durch
   */
  async search(
    context: SearchContext,
    options?: SearchOptions
  ): Promise<StructuredResponse> {
    let attempts = 0
    let lastError: Error | null = null

    while (attempts < this.config.retryAttempts) {
      try {
        const instance = await this.loadBalancer.selectInstance()
        if (!instance) {
          throw new Error('Keine verfügbaren Service-Instanzen')
        }

        // Erstelle einen SmartSearch für die ausgewählte Instanz
        const search = new SmartSearch({
          ...this.config.searchConfig,
          host: instance.host,
          port: instance.port
        })

        return await search.search(context, options)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unbekannter Fehler')
        attempts++
        
        if (attempts < this.config.retryAttempts) {
          await new Promise(resolve => 
            setTimeout(resolve, this.config.retryDelay * Math.pow(2, attempts - 1))
          )
        }
      }
    }

    throw new Error(
      `Suche fehlgeschlagen nach ${attempts} Versuchen: ${lastError?.message}`
    )
  }

  /**
   * Beendet diese Service-Instanz gracefully
   */
  async shutdown(): Promise<void> {
    if (this.instanceId) {
      const instance = await this.loadBalancer.selectInstance()
      if (instance?.id === this.instanceId) {
        // Setze Status auf "draining" um keine neuen Anfragen anzunehmen
        await this.loadBalancer.updateInstanceMetrics(this.instanceId, {
          cpuUsage: 100,
          memoryUsage: 100,
          activeConnections: 0,
          lastUpdate: new Date()
        })
      }
    }
  }
} 