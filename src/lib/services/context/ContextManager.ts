import { Redis } from 'ioredis'
import { SearchContext } from '../search/types'

interface ContextManagerConfig {
  maxHistoryLength: number
  contextTtl: number
  similarityThreshold: number
  redis: Redis
}

export class ContextManager {
  private readonly config: ContextManagerConfig
  private readonly redis: Redis

  constructor(config: ContextManagerConfig) {
    this.config = config
    this.redis = config.redis
  }

  public async saveContext(sessionId: string, context: SearchContext): Promise<void> {
    try {
      // Historien-Länge begrenzen
      if (context.history && context.history.length > this.config.maxHistoryLength) {
        context.history = context.history.slice(-this.config.maxHistoryLength)
      }

      // Timestamps für History-Einträge hinzufügen
      if (context.history) {
        context.history = context.history.map(entry => ({
          ...entry,
          timestamp: entry.timestamp || new Date().toISOString()
        }))
      }

      await this.redis.hset(
        `context:${sessionId}`,
        'context',
        JSON.stringify(context),
        'lastUpdate',
        Date.now().toString()
      )

      // TTL setzen
      await this.redis.expire(`context:${sessionId}`, this.config.contextTtl)
    } catch (error) {
      console.error('Fehler beim Speichern des Kontexts:', error)
      throw error
    }
  }

  public async loadContext(sessionId: string): Promise<SearchContext> {
    try {
      const data = await this.redis.hgetall(`context:${sessionId}`)
      
      if (!data || !data.context) {
        throw new Error('Kontext nicht gefunden')
      }

      return JSON.parse(data.context)
    } catch (error) {
      console.error('Fehler beim Laden des Kontexts:', error)
      throw error
    }
  }

  public async updateContext(sessionId: string, context: SearchContext): Promise<void> {
    await this.saveContext(sessionId, context)
  }

  public async clearContext(sessionId: string): Promise<void> {
    try {
      await this.redis.del(`context:${sessionId}`)
    } catch (error) {
      console.error('Fehler beim Löschen des Kontexts:', error)
      throw error
    }
  }

  public async getContextMetadata(sessionId: string): Promise<{
    lastUpdate: number
    historyLength: number
  }> {
    try {
      const data = await this.redis.hgetall(`context:${sessionId}`)
      
      if (!data || !data.context) {
        return {
          lastUpdate: 0,
          historyLength: 0
        }
      }

      const context = JSON.parse(data.context) as SearchContext
      return {
        lastUpdate: parseInt(data.lastUpdate, 10),
        historyLength: context.history?.length || 0
      }
    } catch (error) {
      console.error('Fehler beim Laden der Kontext-Metadaten:', error)
      throw error
    }
  }
} 