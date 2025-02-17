import { Redis } from 'ioredis'
import { StructuredResponse } from '../search/types'
import { SearchMonitoring } from '../monitoring/SearchMonitoring'

interface CacheConfig {
  localTtl: number
  redisTtl: number
  maxLocalSize: number
}

interface CacheEntry {
  data: StructuredResponse
  timestamp: number
}

export class SearchCache {
  private readonly config: CacheConfig = {
    localTtl: 3600,
    redisTtl: 86400,
    maxLocalSize: 1000
  }

  private readonly localCache: Map<string, CacheEntry> = new Map()
  private readonly redis?: Redis
  private readonly monitoring: SearchMonitoring

  constructor(redis?: Redis, monitoring?: SearchMonitoring) {
    this.redis = redis
    this.monitoring = monitoring || new SearchMonitoring('default')
  }

  public async get(key: string): Promise<StructuredResponse | null> {
    // 1. Lokaler Cache
    const localResult = this.getFromLocalCache(key)
    if (localResult) {
      this.monitoring.updateCacheHitRatio(1, 'local')
      return localResult
    }

    // 2. Redis Cache
    if (this.redis) {
      try {
        const redisResult = await this.redis.get(key)
        if (redisResult) {
          const parsed = JSON.parse(redisResult) as StructuredResponse
          this.monitoring.updateCacheHitRatio(1, 'redis')
          this.setInLocalCache(key, parsed)
          return parsed
        }
      } catch (error) {
        this.monitoring.recordError('cache', error)
        console.warn('Redis Cache-Fehler:', error)
      }
    }

    this.monitoring.updateCacheHitRatio(0, 'cache')
    return null
  }

  public async set(key: string, value: StructuredResponse): Promise<void> {
    // 1. Lokaler Cache
    this.setInLocalCache(key, value)

    // 2. Redis Cache
    if (this.redis) {
      try {
        await this.redis.set(
          key,
          JSON.stringify(value),
          'EX',
          this.config.redisTtl
        )
      } catch (error) {
        console.warn('Redis Cache-Fehler:', error)
      }
    }
  }

  private getFromLocalCache(key: string): StructuredResponse | null {
    const entry = this.localCache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > this.config.localTtl * 1000) {
      this.localCache.delete(key)
      return null
    }

    return entry.data
  }

  private setInLocalCache(key: string, data: StructuredResponse): void {
    if (this.localCache.size >= this.config.maxLocalSize) {
      const oldestKey = this.getOldestCacheKey()
      if (oldestKey) this.localCache.delete(oldestKey)
    }

    this.localCache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  private getOldestCacheKey(): string | null {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, value] of this.localCache.entries()) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp
        oldestKey = key
      }
    }

    return oldestKey
  }

  public async invalidate(pattern: string): Promise<void> {
    // 1. Lokaler Cache
    for (const key of this.localCache.keys()) {
      if (key.includes(pattern)) {
        this.localCache.delete(key)
      }
    }

    // 2. Redis Cache
    if (this.redis) {
      try {
        const keys = await this.redis.keys(`search:*${pattern}*`)
        if (keys.length > 0) {
          await this.redis.del(...keys)
        }
      } catch (error) {
        console.warn('Cache-Invalidierungs-Fehler:', error)
      }
    }
  }
} 