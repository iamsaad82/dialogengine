import { SmartSearch } from '../search/core/search'
import { SearchConfig } from '../search/types'
import { Redis } from 'ioredis'

interface ServiceInstance {
  id: string
  host: string
  port: number
  status: 'active' | 'draining' | 'inactive'
  metrics: {
    cpuUsage: number
    memoryUsage: number
    activeConnections: number
    lastUpdate: Date
  }
}

interface LoadBalancerConfig {
  redis: Redis
  healthCheckInterval: number
  drainTimeout: number
  maxCpuThreshold: number
  maxMemoryThreshold: number
  maxConnectionsThreshold: number
}

export class LoadBalancer {
  private readonly instances: Map<string, ServiceInstance> = new Map()
  private readonly config: LoadBalancerConfig
  private readonly searchConfig: SearchConfig

  constructor(config: LoadBalancerConfig, searchConfig: SearchConfig) {
    this.config = config
    this.searchConfig = searchConfig
    this.startHealthChecks()
  }

  /**
   * Registriert eine neue Service-Instanz
   */
  async registerInstance(host: string, port: number): Promise<string> {
    const id = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const instance: ServiceInstance = {
      id,
      host,
      port,
      status: 'active',
      metrics: {
        cpuUsage: 0,
        memoryUsage: 0,
        activeConnections: 0,
        lastUpdate: new Date()
      }
    }

    this.instances.set(id, instance)
    await this.updateServiceRegistry()
    
    return id
  }

  /**
   * Wählt die am besten geeignete Instanz für eine Anfrage aus
   */
  async selectInstance(): Promise<ServiceInstance | null> {
    const activeInstances = Array.from(this.instances.values())
      .filter(i => i.status === 'active')
      .sort((a, b) => {
        // Bewertung basierend auf Last
        const scoreA = this.calculateInstanceScore(a)
        const scoreB = this.calculateInstanceScore(b)
        return scoreA - scoreB
      })

    return activeInstances[0] || null
  }

  /**
   * Aktualisiert die Metriken einer Instanz
   */
  async updateInstanceMetrics(id: string, metrics: ServiceInstance['metrics']): Promise<void> {
    const instance = this.instances.get(id)
    if (instance) {
      instance.metrics = {
        ...metrics,
        lastUpdate: new Date()
      }

      // Überprüfe Schwellenwerte und setze Status
      if (
        metrics.cpuUsage > this.config.maxCpuThreshold ||
        metrics.memoryUsage > this.config.maxMemoryThreshold ||
        metrics.activeConnections > this.config.maxConnectionsThreshold
      ) {
        instance.status = 'draining'
        setTimeout(() => {
          if (instance.status === 'draining') {
            instance.status = 'active'
          }
        }, this.config.drainTimeout)
      }

      await this.updateServiceRegistry()
    }
  }

  /**
   * Startet regelmäßige Health Checks
   */
  private startHealthChecks(): void {
    setInterval(async () => {
      for (const [id, instance] of this.instances) {
        try {
          const search = new SmartSearch(this.searchConfig)
          const health = await search.getHealthStatus()

          if (health.status === 'unhealthy') {
            instance.status = 'inactive'
          } else if (instance.status === 'inactive') {
            instance.status = 'active'
          }

          // Aktualisiere Metriken
          instance.metrics = {
            cpuUsage: health.metrics.cpuUsage,
            memoryUsage: health.metrics.memoryUsage.percentUsed,
            activeConnections: health.metrics.activeConnections,
            lastUpdate: new Date()
          }
        } catch (error) {
          console.error(`Health Check fehlgeschlagen für Instanz ${id}:`, error)
          instance.status = 'inactive'
        }
      }

      await this.updateServiceRegistry()
    }, this.config.healthCheckInterval)
  }

  /**
   * Berechnet einen Score für die Instanz basierend auf der Last
   */
  private calculateInstanceScore(instance: ServiceInstance): number {
    const cpuWeight = 0.4
    const memoryWeight = 0.3
    const connectionsWeight = 0.3

    return (
      instance.metrics.cpuUsage * cpuWeight +
      instance.metrics.memoryUsage * memoryWeight +
      (instance.metrics.activeConnections / this.config.maxConnectionsThreshold) * connectionsWeight
    )
  }

  /**
   * Aktualisiert das Service-Registry in Redis
   */
  private async updateServiceRegistry(): Promise<void> {
    const registry = Array.from(this.instances.values()).map(instance => ({
      id: instance.id,
      host: instance.host,
      port: instance.port,
      status: instance.status,
      metrics: instance.metrics
    }))

    await this.config.redis.set(
      'search_service_registry',
      JSON.stringify(registry),
      'EX',
      300 // 5 Minuten TTL
    )
  }

  /**
   * Lädt das Service-Registry aus Redis
   */
  private async loadServiceRegistry(): Promise<void> {
    const registryJson = await this.config.redis.get('search_service_registry')
    if (registryJson) {
      const registry = JSON.parse(registryJson)
      this.instances.clear()
      registry.forEach((instance: ServiceInstance) => {
        this.instances.set(instance.id, instance)
      })
    }
  }
} 