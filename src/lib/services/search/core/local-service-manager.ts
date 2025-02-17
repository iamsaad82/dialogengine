import { SearchConfig, SearchContext, SearchOptions, StructuredResponse, ContentType } from '../types'
import { MonitoringService } from '../../../monitoring/monitoring'

export class LocalServiceManager {
  private readonly config: SearchConfig
  private readonly monitoring?: MonitoringService

  constructor(config: SearchConfig, monitoring?: MonitoringService) {
    this.config = config
    this.monitoring = monitoring
  }

  public async search(
    context: SearchContext,
    options?: SearchOptions
  ): Promise<StructuredResponse> {
    const startTime = Date.now()
    
    try {
      // Validiere den Kontext
      if (!context.query || !context.templateId) {
        throw new Error('Ungültiger Suchkontext: query und templateId sind erforderlich')
      }

      // Lokale Implementierung - direkte Weiterleitung
      const response: StructuredResponse = {
        answer: 'Lokale Antwort',
        confidence: 1.0,
        type: 'info' as ContentType,
        metadata: {
          source: 'local-service-manager',
          timestamp: new Date().toISOString(),
          processingTime: 0,
          cacheHit: false,
          templateId: context.templateId
        }
      }

      // Zeichne Metriken auf
      if (this.monitoring) {
        const duration = (Date.now() - startTime) / 1000
        this.monitoring.recordSearchLatency(duration, 'local-service')
        this.monitoring.recordSearchRequest('success', 'local-service')
      }

      return response
    } catch (error) {
      // Zeichne Fehler auf
      if (this.monitoring) {
        this.monitoring.recordSearchRequest('error', 'local-service')
        this.monitoring.recordError('search', error instanceof Error ? error.message : 'Unbekannter Fehler')
      }

      // Gebe eine Fehlerantwort zurück
      return {
        answer: 'Ein Fehler ist aufgetreten',
        confidence: 0,
        type: 'error' as ContentType,
        metadata: {
          source: 'local-service-manager',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        }
      }
    }
  }

  public async shutdown(): Promise<void> {
    try {
      // Cleanup-Logik hier implementieren, falls erforderlich
      if (this.monitoring) {
        this.monitoring.updateActiveConnections(0)
      }
    } catch (error) {
      console.error('Fehler beim Herunterfahren des LocalServiceManager:', error)
    }
  }
} 