import Redis, { RedisOptions } from 'ioredis'
import { EventEmitter } from 'events'
import { ScanStatus } from '../types'

let redisClient: Redis | null = null

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
  }
  return redisClient
}

export function closeRedisConnection() {
  if (redisClient) {
    redisClient.disconnect()
    redisClient = null
  }
}

export interface RedisConfig {
  retryStrategy?: (retries: number) => number | null
  maxRetriesPerRequest?: number
  connectTimeout?: number
  lazyConnect?: boolean
  enableReadyCheck?: boolean
  enableOfflineQueue?: boolean
  family?: number
  commandTimeout?: number
}

export class RedisClient extends EventEmitter {
  private client: Redis
  private _status: 'connected' | 'disconnected' | 'error' = 'disconnected'

  constructor(url: string, options: RedisOptions = {}) {
    super()
    
    // Parse Redis URL
    const redisUrl = new URL(url)
    const redisOptions: RedisOptions = {
      ...options,
      host: redisUrl.hostname,
      port: parseInt(redisUrl.port || '6379', 10),
      username: redisUrl.username || undefined,
      password: redisUrl.password || undefined,
      db: parseInt(redisUrl.pathname.slice(1) || '0', 10),
      tls: redisUrl.protocol === 'rediss:' ? {} : undefined
    }

    this.client = new Redis(redisOptions)

    this.client.on('connect', () => {
      this._status = 'connected'
      this.emit('connect')
    })

    this.client.on('error', (error) => {
      this._status = 'error'
      this.emit('error', error)
    })

    this.client.on('close', () => {
      this._status = 'disconnected'
      this.emit('close')
    })

    this.client.on('ready', () => {
      this.emit('ready')
    })
  }

  get status(): 'connected' | 'disconnected' | 'error' {
    return this._status
  }

  async ping(): Promise<string> {
    return this.client.ping()
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key)
  }

  async set(key: string, value: string): Promise<'OK'> {
    return this.client.set(key, value)
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    return this.client.setex(key, seconds, value)
  }

  async del(key: string): Promise<number> {
    return this.client.del(key)
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern)
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key)
  }

  async quit(): Promise<'OK'> {
    return this.client.quit()
  }

  async testConnection() {
    await this.client.ping()
    console.log('Redis-Verbindung erfolgreich getestet')
  }

  async setScanStatus(scanId: string, status: ScanStatus, ttl?: number) {
    const key = `scan:${scanId}`
    await this.client.set(key, JSON.stringify(status))
    if (ttl) {
      await this.client.expire(key, ttl)
    }
  }

  async getScanStatus(scanId: string): Promise<ScanStatus | null> {
    const key = `scan:${scanId}`
    const data = await this.client.get(key)
    return data ? JSON.parse(data) : null
  }
} 