import { Redis } from 'ioredis'
import { SearchConfig } from '../types'

interface ServiceInstance {
  host: string
  port: number
  status: 'active' | 'draining' | 'unhealthy'
  lastHeartbeat: number
  metrics?: {
    cpuUsage: number
    memoryUsage: number
    activeConnections: number
  }
}

interface LoadBalancerConfig {
  strategy: 'round-robin' | 'least-connections' | 'weighted'
  healthCheckInterval: number
  unhealthyThreshold: number
  servicePattern: string
}

export class LoadBalancer {
  private readonly config: SearchConfig
  private readonly redis: Redis
  private readonly balancerConfig: LoadBalancerConfig
  private currentIndex = 0

  constructor(config: SearchConfig, redis: Redis) {
    this.config = config
    this.redis = redis
    
    // LoadBalancer-spezifische Konfiguration
    this.balancerConfig = {
      strategy: config.loadBalancing?.strategy || 'round-robin',
      healthCheckInterval: config.loadBalancing?.healthCheck?.interval || 30000,
      unhealthyThreshold: config.loadBalancing?.healthCheck?.timeout || 5000,
      servicePattern: 'service:*'
    }
    
    if (config.loadBalancing?.enabled) {
      this.startHealthChecks()
    }
  }

  private startHealthChecks(): void {
    setInterval(async () => {
      try {
        const services = await this.getServices()
        await this.checkServicesHealth(services)
      } catch (error) {
        console.error('Fehler beim Health Check:', error)
      }
    }, this.balancerConfig.healthCheckInterval)
  }

  private async checkServicesHealth(services: ServiceInstance[]): Promise<void> {
    const now = Date.now()
    
    for (const service of services) {
      try {
        const timeSinceLastHeartbeat = now - service.lastHeartbeat
        
        if (timeSinceLastHeartbeat > this.balancerConfig.unhealthyThreshold) {
          await this.markServiceUnhealthy(service)
        }
      } catch (error) {
        console.error(`Fehler beim Health Check für Service ${service.host}:${service.port}:`, error)
      }
    }
  }

  private async getServices(): Promise<ServiceInstance[]> {
    const keys = await this.redis.keys(this.balancerConfig.servicePattern)
    const services: ServiceInstance[] = []

    for (const key of keys) {
      try {
        const serviceData = await this.redis.hgetall(key)
        if (serviceData && serviceData.status === 'active') {
          services.push({
            host: serviceData.host,
            port: parseInt(serviceData.port, 10),
            status: serviceData.status,
            lastHeartbeat: parseInt(serviceData.lastHeartbeat, 10),
            metrics: serviceData.metrics ? JSON.parse(serviceData.metrics) : undefined
          })
        }
      } catch (error) {
        console.error(`Fehler beim Laden des Service ${key}:`, error)
      }
    }

    return services
  }

  private async markServiceUnhealthy(service: ServiceInstance): Promise<void> {
    const key = `service:${service.host}:${service.port}`
    await this.redis.hset(key, 'status', 'unhealthy')
  }

  public async selectService(): Promise<ServiceInstance | null> {
    const activeServices = await this.getServices()
    
    if (!activeServices.length) {
      return null
    }

    switch (this.balancerConfig.strategy) {
      case 'round-robin':
        return this.selectRoundRobin(activeServices)
      case 'least-connections':
        return this.selectLeastConnections(activeServices)
      case 'weighted':
        return this.selectWeighted(activeServices)
      default:
        return this.selectRoundRobin(activeServices)
    }
  }

  private selectRoundRobin(services: ServiceInstance[]): ServiceInstance {
    const service = services[this.currentIndex % services.length]
    this.currentIndex++
    return service
  }

  private selectLeastConnections(services: ServiceInstance[]): ServiceInstance {
    return services.reduce((min, service) => {
      const connections = service.metrics?.activeConnections ?? Infinity
      const minConnections = min.metrics?.activeConnections ?? Infinity
      return connections < minConnections ? service : min
    })
  }

  private selectWeighted(services: ServiceInstance[]): ServiceInstance {
    return services.reduce((best, service) => {
      if (!service.metrics || !best.metrics) return best

      const score = this.calculateScore(service.metrics)
      const bestScore = this.calculateScore(best.metrics)

      return score > bestScore ? service : best
    })
  }

  private calculateScore(metrics: ServiceInstance['metrics']): number {
    if (!metrics) return 0

    // Gewichtung: CPU (40%), Memory (30%), Connections (30%)
    const cpuScore = (100 - metrics.cpuUsage) * 0.4
    const memoryScore = (100 - metrics.memoryUsage) * 0.3
    const connectionsScore = (1000 - metrics.activeConnections) / 10 * 0.3

    return cpuScore + memoryScore + connectionsScore
  }
} 