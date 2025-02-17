import { OpenAI } from 'openai'
import { Pinecone } from '@pinecone-database/pinecone'
import { Redis } from 'ioredis'
import os from 'os'

interface SystemMetrics {
  cpuUsage: number
  memoryUsage: {
    total: number
    free: number
    percentUsed: number
  }
  activeConnections: number
  lastUpdate: Date
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  openai: boolean
  pinecone: boolean
  redis?: boolean
  metrics: SystemMetrics
  lastCheck: Date
}

export interface SearchHealthConfig {
  openai: OpenAI
  pinecone: Pinecone
  indexName: string
  redis?: Redis
}

export class SearchHealth {
  private readonly openai: OpenAI
  private readonly pinecone: Pinecone
  private readonly redis?: Redis
  private readonly indexName: string
  private status: HealthStatus = {
    status: 'healthy',
    openai: true,
    pinecone: true,
    redis: true,
    metrics: {
      cpuUsage: 0,
      memoryUsage: {
        total: 0,
        free: 0,
        percentUsed: 0
      },
      activeConnections: 0,
      lastUpdate: new Date()
    },
    lastCheck: new Date()
  }

  constructor(config: SearchHealthConfig) {
    this.openai = config.openai
    this.pinecone = config.pinecone
    this.indexName = config.indexName
    this.redis = config.redis
    this.startHealthChecks()
  }

  private startHealthChecks(): void {
    setInterval(async () => {
      await this.performHealthCheck()
    }, 30000) // Alle 30 Sekunden

    setInterval(async () => {
      await this.collectMetrics()
    }, 5000) // Alle 5 Sekunden
  }

  private async performHealthCheck(): Promise<void> {
    const checks = await Promise.all([
      this.checkOpenAI(),
      this.checkPinecone(),
      this.checkRedis()
    ])

    this.status = {
      status: this.determineOverallStatus(checks),
      openai: checks[0],
      pinecone: checks[1],
      redis: checks[2],
      metrics: this.status.metrics,
      lastCheck: new Date()
    }
  }

  private async collectMetrics(): Promise<void> {
    const cpus = os.cpus()
    const totalCPU = cpus.reduce((acc, cpu) => 
      acc + Object.values(cpu.times).reduce((sum, time) => sum + time, 0), 0)
    const cpuUsage = process.cpuUsage()
    const cpuUsagePercent = (cpuUsage.user + cpuUsage.system) / (totalCPU * 1000000) * 100

    const totalMemory = os.totalmem()
    const freeMemory = os.freemem()
    const usedMemory = totalMemory - freeMemory
    const memoryUsagePercent = (usedMemory / totalMemory) * 100

    this.status.metrics = {
      cpuUsage: cpuUsagePercent,
      memoryUsage: {
        total: totalMemory,
        free: freeMemory,
        percentUsed: memoryUsagePercent
      },
      activeConnections: this.status.metrics.activeConnections,
      lastUpdate: new Date()
    }
  }

  private determineOverallStatus(checks: boolean[]): 'healthy' | 'degraded' | 'unhealthy' {
    const [openai, pinecone, redis] = checks

    if (!openai || !pinecone) {
      return 'unhealthy'
    }

    if (!redis && this.redis) {
      return 'degraded'
    }

    if (this.status.metrics.cpuUsage > 80 || 
        this.status.metrics.memoryUsage.percentUsed > 85) {
      return 'degraded'
    }

    return 'healthy'
  }

  private async checkOpenAI(): Promise<boolean> {
    if (!this.openai) return false

    try {
      await this.openai.models.list()
      return true
    } catch (error) {
      console.error('OpenAI Health Check fehlgeschlagen:', error)
      return false
    }
  }

  private async checkPinecone(): Promise<boolean> {
    if (!this.pinecone) return false

    try {
      const index = this.pinecone.index(this.indexName)
      await index.describeIndexStats()
      return true
    } catch (error) {
      console.error('Pinecone Health Check fehlgeschlagen:', error)
      return false
    }
  }

  private async checkRedis(): Promise<boolean> {
    if (!this.redis) return true // Redis ist optional

    try {
      await this.redis.ping()
      return true
    } catch (error) {
      console.error('Redis Health Check fehlgeschlagen:', error)
      return false
    }
  }

  public getStatus(): HealthStatus {
    return { ...this.status }
  }

  public isHealthy(): boolean {
    return this.status.status === 'healthy'
  }

  public canAcceptConnections(): boolean {
    return this.status.status !== 'unhealthy' && 
           this.status.metrics.cpuUsage < 90 &&
           this.status.metrics.memoryUsage.percentUsed < 90
  }

  public updateActiveConnections(count: number): void {
    this.status.metrics.activeConnections = count
  }
} 