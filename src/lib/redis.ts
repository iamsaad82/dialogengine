import { createClient } from 'redis'
import { EventEmitter } from 'events'
import { ScanStatus } from '../types'

let redisClient: any | null = null
let isRedisEnabled = process.env.REDIS_ENABLED === 'true'

export function getRedisClient(): any | null {
  if (!isRedisEnabled) {
    console.log('[Redis] Redis ist deaktiviert')
    return null
  }

  if (!redisClient) {
    try {
      redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      })
      console.log('[Redis] Redis-Client erfolgreich initialisiert')
    } catch (error) {
      console.error('[Redis] Fehler beim Initialisieren des Redis-Clients:', error)
      return null
    }
  }
  return redisClient
}

export function closeRedisConnection() {
  if (redisClient) {
    redisClient.quit()
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

export type RedisStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export class RedisClient extends EventEmitter {
  private client: any | null = null
  private _status: RedisStatus = 'disconnected'
  private url: string = 'redis://localhost:6379'
  private options: any = {}
  private retryCount: number = 0
  private readonly maxRetries: number = 3

  constructor(url: string = 'redis://localhost:6379', options: any = {}) {
    super()
    
    if (!isRedisEnabled) {
      console.log('[Redis] Redis ist deaktiviert')
      return
    }

    this.url = url
    this.options = {
      ...options,
      tls: {
        rejectUnauthorized: false
      },
      retryStrategy: this.retryStrategy.bind(this)
    }
  }

  private retryStrategy(retries: number): number | null {
    if (retries >= this.maxRetries) {
      this._status = 'error'
      this.emit('error', new Error('Max retries exceeded'))
      return null
    }
    return Math.min(retries * 1000, 3000)
  }

  private setupEventListeners(): void {
    if (!this.client) return

    this.client.on('connect', () => {
      this._status = 'connected'
      this.emit('connect')
    })

    this.client.on('error', (err: Error) => {
      this._status = 'error'
      this.emit('error', err)
    })

    this.client.on('end', () => {
      this._status = 'disconnected'
      this.emit('end')
    })

    this.client.on('reconnecting', () => {
      this._status = 'connecting'
      this.emit('reconnecting')
    })
  }

  public async connect(): Promise<void> {
    if (!isRedisEnabled) return
    if (this._status === 'connected') return

    try {
      this._status = 'connecting'
      this.client = createClient({
        url: this.url,
        ...this.options
      })

      this.setupEventListeners()
      await this.client.connect()
    } catch (error) {
      this._status = 'error'
      console.error('[Redis] Verbindungsfehler:', error)
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.client || this._status === 'disconnected') return

    try {
      await this.client.quit()
      this._status = 'disconnected'
    } catch (error) {
      this._status = 'error'
      throw error
    }
  }

  public async testConnection(): Promise<boolean> {
    if (!isRedisEnabled) return false
    if (!this.client || this._status !== 'connected') return false

    try {
      await this.client.ping()
      return true
    } catch {
      return false
    }
  }

  public async set(key: string, value: string | number | Buffer, ttl?: number): Promise<void> {
    if (!this.client) throw new Error('Redis client not initialized')

    try {
      const stringValue = value.toString()
      if (ttl) {
        await this.client.set(key, stringValue, {
          EX: ttl
        })
      } else {
        await this.client.set(key, stringValue)
      }
    } catch (error) {
      throw error
    }
  }

  public async get(key: string): Promise<string | null> {
    if (!this.client) throw new Error('Redis client not initialized')

    try {
      return await this.client.get(key)
    } catch (error) {
      throw error
    }
  }

  public async del(key: string): Promise<void> {
    if (!this.client) throw new Error('Redis client not initialized')

    try {
      await this.client.del(key)
    } catch (error) {
      throw error
    }
  }

  public async keys(pattern: string): Promise<string[]> {
    if (!this.client) throw new Error('Redis client not initialized')

    try {
      return await this.client.keys(pattern)
    } catch (error) {
      throw error
    }
  }

  public async setScanStatus(scanId: string, status: ScanStatus, ttl?: number): Promise<void> {
    if (!this.client) {
      await this.connect()
    }

    const key = `scan:${scanId}`
    const value = JSON.stringify(status)

    try {
      if (ttl) {
        await this.client.set(key, value, {
          EX: ttl
        })
      } else {
        await this.client.set(key, value)
      }
    } catch (error) {
      throw error
    }
  }

  public async getScanStatus(scanId: string): Promise<ScanStatus | null> {
    if (!this.client) {
      await this.connect()
    }

    try {
      const key = `scan:${scanId}`
      const value = await this.client.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      throw error
    }
  }

  public get status(): RedisStatus {
    return this._status
  }
} 