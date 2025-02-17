import { SearchContext } from '../search/types'
import { MonitoringService } from '../../monitoring/monitoring'

interface LocalContextManagerConfig {
  maxHistoryLength: number
  contextTtl: number
  similarityThreshold: number
}

interface ContextEntry {
  context: SearchContext
  timestamp: number
  accessCount: number
  lastAccess: number
}

export class LocalContextManager {
  private readonly config: LocalContextManagerConfig
  private readonly monitoring?: MonitoringService
  private readonly contextHistory: Map<string, ContextEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(config: LocalContextManagerConfig, monitoring?: MonitoringService) {
    this.config = config
    this.monitoring = monitoring
    this.startCleanupInterval()
  }

  public async getContext(sessionId: string): Promise<SearchContext | null> {
    const startTime = Date.now()
    
    try {
      if (!sessionId) {
        throw new Error('SessionId ist erforderlich')
      }

      const entry = this.contextHistory.get(sessionId)
      if (!entry) {
        if (this.monitoring) {
          this.monitoring.updateCacheHitRatio(0, 'context-cache')
        }
        return null
      }

      // Prüfe TTL
      if (this.isExpired(entry)) {
        this.contextHistory.delete(sessionId)
        if (this.monitoring) {
          this.monitoring.updateCacheHitRatio(0, 'context-cache')
        }
        return null
      }

      // Aktualisiere Zugriffsinformationen
      entry.accessCount++
      entry.lastAccess = Date.now()
      this.contextHistory.set(sessionId, entry)

      if (this.monitoring) {
        const duration = (Date.now() - startTime) / 1000
        this.monitoring.recordSearchLatency(duration, 'context-manager')
        this.monitoring.updateCacheHitRatio(1, 'context-cache')
      }

      return entry.context
    } catch (error) {
      if (this.monitoring) {
        this.monitoring.recordError('context-manager', error instanceof Error ? error.message : 'Unbekannter Fehler')
      }
      return null
    }
  }

  public async setContext(sessionId: string, context: SearchContext): Promise<void> {
    const startTime = Date.now()
    
    try {
      if (!sessionId || !context) {
        throw new Error('SessionId und Context sind erforderlich')
      }

      // Speichere Kontext mit Metadaten
      this.contextHistory.set(sessionId, {
        context,
        timestamp: Date.now(),
        accessCount: 1,
        lastAccess: Date.now()
      })

      // Entferne alte Einträge wenn maxHistoryLength überschritten
      this.enforceHistoryLimit()

      if (this.monitoring) {
        const duration = (Date.now() - startTime) / 1000
        this.monitoring.recordSearchLatency(duration, 'context-manager')
      }
    } catch (error) {
      if (this.monitoring) {
        this.monitoring.recordError('context-manager', error instanceof Error ? error.message : 'Unbekannter Fehler')
      }
      throw error
    }
  }

  public async clearContext(sessionId: string): Promise<void> {
    try {
      if (!sessionId) {
        throw new Error('SessionId ist erforderlich')
      }

      this.contextHistory.delete(sessionId)
      
      if (this.monitoring) {
        this.monitoring.recordSearchRequest('success', 'context-clear')
      }
    } catch (error) {
      if (this.monitoring) {
        this.monitoring.recordError('context-manager', error instanceof Error ? error.message : 'Unbekannter Fehler')
      }
      throw error
    }
  }

  private isExpired(entry: ContextEntry): boolean {
    return Date.now() - entry.timestamp > this.config.contextTtl * 1000
  }

  private enforceHistoryLimit(): void {
    if (this.contextHistory.size <= this.config.maxHistoryLength) {
      return
    }

    // Sortiere nach letztem Zugriff und Zugriffshäufigkeit
    const entries = Array.from(this.contextHistory.entries())
      .sort(([, a], [, b]) => {
        const accessScore = b.accessCount - a.accessCount
        const timeScore = b.lastAccess - a.lastAccess
        return accessScore + timeScore * 0.5
      })

    // Behalte nur die wichtigsten Einträge
    const toRemove = entries.slice(this.config.maxHistoryLength)
    toRemove.forEach(([key]) => this.contextHistory.delete(key))
  }

  private startCleanupInterval(): void {
    // Regelmäßige Bereinigung alle 5 Minuten
    this.cleanupInterval = setInterval(() => {
      try {
        for (const [sessionId, entry] of this.contextHistory.entries()) {
          if (this.isExpired(entry)) {
            this.contextHistory.delete(sessionId)
          }
        }
      } catch (error) {
        console.error('Fehler bei der Kontext-Bereinigung:', error)
      }
    }, 5 * 60 * 1000)
  }

  public async shutdown(): Promise<void> {
    try {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval)
        this.cleanupInterval = null
      }
      this.contextHistory.clear()
      
      if (this.monitoring) {
        this.monitoring.recordSearchRequest('success', 'context-shutdown')
      }
    } catch (error) {
      if (this.monitoring) {
        this.monitoring.recordError('context-manager', error instanceof Error ? error.message : 'Unbekannter Fehler')
      }
      console.error('Fehler beim Herunterfahren des LocalContextManager:', error)
    }
  }

  // Getter für Tests und Monitoring
  public getContextCount(): number {
    return this.contextHistory.size
  }

  public getContextStats(): { total: number; active: number; expired: number } {
    let expired = 0
    let active = 0

    this.contextHistory.forEach(entry => {
      if (this.isExpired(entry)) {
        expired++
      } else {
        active++
      }
    })

    return {
      total: this.contextHistory.size,
      active,
      expired
    }
  }
} 