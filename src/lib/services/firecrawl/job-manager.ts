import { RedisClient } from '../../redis'
import { CrawlStatus, ScanProgress } from './types'

export class JobManager {
  private jobs: Map<string, CrawlStatus>
  private redis: RedisClient

  constructor(redisUrl?: string) {
    const redisConfig = {
      retryStrategy: (times: number) => {
        if (times > 3) {
          console.error('Redis-Verbindung fehlgeschlagen nach 3 Versuchen')
          return null
        }
        return Math.min(times * 1000, 3000)
      },
      maxRetriesPerRequest: 3,
      connectTimeout: 20000,
      lazyConnect: true,
      enableReadyCheck: true,
      enableOfflineQueue: true,
      family: 4,
      commandTimeout: 10000
    }

    this.redis = new RedisClient(redisUrl || process.env.REDIS_URL || 'redis://127.0.0.1:6379', redisConfig)
    this.jobs = new Map()

    this.setupRedisListeners()
    this.testRedisConnection()
  }

  private setupRedisListeners(): void {
    this.redis.on('error', (error) => {
      console.error('Redis Fehler:', error)
    })

    this.redis.on('connect', () => {
      console.log('Redis verbunden')
    })

    this.redis.on('ready', () => {
      console.log('Redis bereit')
      this.cleanupOldJobs()
    })

    this.redis.on('close', () => {
      console.log('Redis-Verbindung geschlossen')
    })
  }

  private async testRedisConnection(): Promise<void> {
    try {
      const result = await this.redis.ping()
      if (result !== 'PONG') {
        throw new Error('Redis-Verbindungstest fehlgeschlagen: Unerwartete Antwort')
      }
      console.log('Redis-Verbindung erfolgreich getestet')
    } catch (error) {
      console.error('Redis-Verbindungstest fehlgeschlagen:', error)
      throw error
    }
  }

  async updateProgress(jobId: string, progress: ScanProgress): Promise<void> {
    if (!this.redis) return

    try {
      const status = await this.redis.status
      if (status !== 'connected') {
        console.warn('Redis nicht verbunden - Überspringe Progress-Update')
        return
      }

      const key = `crawl:${jobId}:progress`
      await this.redis.setex(key, 3600, JSON.stringify(progress))
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Fortschritts:', error)
    }
  }

  async getProgress(jobId: string): Promise<ScanProgress | null> {
    if (!this.redis) return null

    try {
      const key = `crawl:${jobId}:progress`
      const data = await this.redis.get(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Fehler beim Abrufen des Fortschritts:', error)
      return null
    }
  }

  async cleanupOldJobs(): Promise<void> {
    try {
      const keys = await this.redis.keys('crawl:*:progress')
      for (const key of keys) {
        const ttl = await this.redis.ttl(key)
        if (ttl <= 0) {
          await this.redis.del(key)
        }
      }
    } catch (error) {
      console.error('Fehler beim Aufräumen alter Jobs:', error)
    }
  }

  getJob(jobId: string): CrawlStatus | undefined {
    return this.jobs.get(jobId)
  }

  setJob(jobId: string, status: CrawlStatus): void {
    this.jobs.set(jobId, status)
  }

  deleteJob(jobId: string): void {
    this.jobs.delete(jobId)
  }

  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit()
    }
  }
} 