import { Registry, Counter, Gauge, Histogram } from 'prom-client'
import { PrismaClient } from '@prisma/client'
import { Redis } from 'ioredis'

interface DatabaseMonitoringConfig {
  serviceName: string
  serviceVersion: string
  prisma: PrismaClient
  redis?: Redis
  collectInterval?: number
}

export class DatabaseMonitoringService {
  private readonly registry: Registry
  private readonly prisma: PrismaClient
  private readonly redis?: Redis
  private readonly queryLatency: Histogram<string>
  private readonly queryCount: Counter<string>
  private readonly connectionPoolSize: Gauge<string>
  private readonly redisOperations: Counter<string>
  private readonly redisLatency: Histogram<string>
  private readonly redisCacheSize: Gauge<string>
  private readonly redisMemoryUsage: Gauge<string>
  private readonly templateGauge: Gauge<string>
  private readonly chatLogGauge: Gauge<string>
  private readonly assetGauge: Gauge<string>
  private collectionInterval: NodeJS.Timeout | null = null

  constructor(config: DatabaseMonitoringConfig) {
    this.registry = new Registry()
    this.prisma = config.prisma
    this.redis = config.redis

    // Query-Latenz
    this.queryLatency = new Histogram({
      name: 'db_query_latency_seconds',
      help: 'Latenz der Datenbankabfragen in Sekunden',
      labelNames: ['operation', 'model'],
      buckets: [0.1, 0.5, 1, 2, 5],
      registers: [this.registry]
    })

    // Query-Anzahl
    this.queryCount = new Counter({
      name: 'db_query_total',
      help: 'Anzahl der Datenbankabfragen',
      labelNames: ['operation', 'model', 'status'],
      registers: [this.registry]
    })

    // Connection-Pool-Größe
    this.connectionPoolSize = new Gauge({
      name: 'db_connection_pool_size',
      help: 'Größe des Datenbankverbindungs-Pools',
      registers: [this.registry]
    })

    // Redis-Operationen
    this.redisOperations = new Counter({
      name: 'redis_operations_total',
      help: 'Anzahl der Redis-Operationen',
      labelNames: ['operation', 'status'],
      registers: [this.registry]
    })

    // Redis-Latenz
    this.redisLatency = new Histogram({
      name: 'redis_operation_latency_seconds',
      help: 'Latenz der Redis-Operationen in Sekunden',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1],
      registers: [this.registry]
    })

    // Redis-Cache-Größe
    this.redisCacheSize = new Gauge({
      name: 'redis_cache_size_bytes',
      help: 'Größe des Redis-Caches in Bytes',
      registers: [this.registry]
    })

    // Redis-Speichernutzung
    this.redisMemoryUsage = new Gauge({
      name: 'redis_memory_usage_bytes',
      help: 'Redis-Speichernutzung in Bytes',
      registers: [this.registry]
    })

    // Template-Anzahl
    this.templateGauge = new Gauge({
      name: 'db_template_count',
      help: 'Anzahl der Templates',
      registers: [this.registry]
    })

    // ChatLog-Anzahl
    this.chatLogGauge = new Gauge({
      name: 'db_chatlog_count',
      help: 'Anzahl der ChatLogs',
      registers: [this.registry]
    })

    // Asset-Anzahl
    this.assetGauge = new Gauge({
      name: 'db_asset_count',
      help: 'Anzahl der Assets',
      registers: [this.registry]
    })

    // Metriken-Sammlung starten
    this.startMetricsCollection(config.collectInterval || 15000)
  }

  // Query-Latenz aufzeichnen
  public async recordQueryLatency(operation: string, model: string, duration: number): Promise<void> {
    try {
      this.queryLatency.observe({ operation, model }, duration)
    } catch (error) {
      console.error('Fehler beim Aufzeichnen der Query-Latenz:', error)
    }
  }

  // Query zählen
  public recordQuery(operation: string, model: string, success: boolean): void {
    try {
      this.queryCount.inc({
        operation,
        model,
        status: success ? 'success' : 'error'
      })
    } catch (error) {
      console.error('Fehler beim Zählen der Query:', error)
    }
  }

  // Redis-Operation aufzeichnen
  public recordRedisOperation(operation: string, success: boolean): void {
    if (!this.redis) return

    try {
      this.redisOperations.inc({
        operation,
        status: success ? 'success' : 'error'
      })
    } catch (error) {
      console.error('Fehler beim Aufzeichnen der Redis-Operation:', error)
    }
  }

  // Redis-Latenz aufzeichnen
  public recordRedisLatency(operation: string, duration: number): void {
    if (!this.redis) return

    try {
      this.redisLatency.observe({ operation }, duration)
    } catch (error) {
      console.error('Fehler beim Aufzeichnen der Redis-Latenz:', error)
    }
  }

  private async collectDatabaseMetrics(): Promise<void> {
    try {
      // Konvertiere BigInt zu Number für die Metriken
      const [templateCount, chatLogCount, assetCount] = await Promise.all([
        this.prisma.template.count(),
        this.prisma.chatLog.count(),
        this.prisma.asset.count()
      ]);

      // Sichere Konvertierung von BigInt zu Number
      const safeNumber = (value: number | bigint): number => {
        if (typeof value === 'bigint') {
          return Number(value.toString())
        }
        return value
      }

      this.templateGauge.set(safeNumber(templateCount))
      this.chatLogGauge.set(safeNumber(chatLogCount))
      this.assetGauge.set(safeNumber(assetCount))

      // Redis-Metriken sammeln
      if (this.redis) {
        const info = await this.redis.info()
        const memory = this.parseRedisInfo(info)
        
        if (memory.used) {
          this.redisMemoryUsage.set(memory.used)
        }
        
        const dbSize = await this.redis.dbsize()
        this.redisCacheSize.set(dbSize)
      }
    } catch (error) {
      console.error('Fehler beim Sammeln der Datenbankmetriken:', error)
    }
  }

  private async getActiveQueries(): Promise<number> {
    try {
      // Führe eine Diagnose-Query aus
      const result = await this.prisma.$queryRaw`
        SELECT count(*) as active_connections 
        FROM pg_stat_activity 
        WHERE state = 'active'
      `
      return Array.isArray(result) && result.length > 0 ? (result[0] as any).active_connections : 0
    } catch (error) {
      console.error('Fehler beim Abrufen aktiver Queries:', error)
      return 0
    }
  }

  private parseRedisInfo(info: string): { used?: number } {
    const result: { used?: number } = {}
    
    const lines = info.split('\n')
    for (const line of lines) {
      if (line.startsWith('used_memory:')) {
        result.used = parseInt(line.split(':')[1], 10)
        break
      }
    }
    
    return result
  }

  private startMetricsCollection(interval: number): void {
    this.collectionInterval = setInterval(() => {
      this.collectDatabaseMetrics()
    }, interval)
  }

  public async getMetrics(): Promise<string> {
    return this.registry.metrics()
  }

  public async getMetricsAsJson(): Promise<object> {
    return this.registry.getMetricsAsJSON()
  }

  public stopMetricsCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval)
      this.collectionInterval = null
    }
  }
} 