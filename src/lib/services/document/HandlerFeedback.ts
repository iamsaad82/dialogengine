import { MonitoringService } from '../../monitoring/monitoring'
import { HandlerConfig } from '../../types/template'

interface FeedbackEntry {
  handlerId: string
  templateId: string
  timestamp: string
  success: boolean
  query: string
  response: string
  userFeedback?: {
    rating: number
    comment?: string
  }
  metrics: {
    responseTime: number
    confidence: number
  }
}

export class HandlerFeedback {
  private feedbackHistory: Map<string, FeedbackEntry[]>

  constructor(private monitoring: MonitoringService) {
    this.feedbackHistory = new Map()
  }

  public recordFeedback(
    handlerId: string,
    templateId: string,
    query: string,
    response: string,
    metrics: {
      responseTime: number
      confidence: number
    },
    success: boolean,
    userFeedback?: {
      rating: number
      comment?: string
    }
  ): void {
    const entry: FeedbackEntry = {
      handlerId,
      templateId,
      timestamp: new Date().toISOString(),
      success,
      query,
      response,
      userFeedback,
      metrics
    }

    // Füge Feedback zur Historie hinzu
    const history = this.feedbackHistory.get(handlerId) || []
    history.push(entry)
    this.feedbackHistory.set(handlerId, history)

    // Aktualisiere Monitoring-Metriken
    this.updateMetrics(entry)
  }

  private updateMetrics(entry: FeedbackEntry): void {
    // Erfolgsrate
    this.monitoring.recordHandlerCall(entry.handlerId, entry.success)

    // Antwortzeit
    this.monitoring.recordHandlerLatency(entry.metrics.responseTime)

    // Wenn Benutzer-Feedback vorhanden
    if (entry.userFeedback) {
      this.monitoring.recordUserFeedback(
        entry.handlerId,
        entry.userFeedback.rating,
        entry.templateId
      )
    }
  }

  public async optimizeHandler(
    handlerId: string,
    currentConfig: HandlerConfig
  ): Promise<HandlerConfig> {
    const history = this.feedbackHistory.get(handlerId) || []
    
    if (history.length < 10) {
      // Nicht genug Daten für Optimierung
      return currentConfig
    }

    // Analysiere Feedback-Historie
    const analysis = this.analyzeFeedback(history)

    // Optimiere Konfiguration basierend auf Analyse
    return this.generateOptimizedConfig(currentConfig, analysis)
  }

  private analyzeFeedback(history: FeedbackEntry[]): {
    successRate: number
    avgResponseTime: number
    avgConfidence: number
    avgUserRating: number
    commonFailures: string[]
  } {
    const successCount = history.filter(entry => entry.success).length
    const successRate = successCount / history.length

    const avgResponseTime = history.reduce(
      (sum, entry) => sum + entry.metrics.responseTime,
      0
    ) / history.length

    const avgConfidence = history.reduce(
      (sum, entry) => sum + entry.metrics.confidence,
      0
    ) / history.length

    const ratingsCount = history.filter(entry => entry.userFeedback).length
    const avgUserRating = ratingsCount > 0
      ? history.reduce(
          (sum, entry) => sum + (entry.userFeedback?.rating || 0),
          0
        ) / ratingsCount
      : 0

    // Identifiziere häufige Fehlermuster
    const commonFailures = this.identifyCommonFailures(history)

    return {
      successRate,
      avgResponseTime,
      avgConfidence,
      avgUserRating,
      commonFailures
    }
  }

  private identifyCommonFailures(history: FeedbackEntry[]): string[] {
    const failures = history
      .filter(entry => !entry.success)
      .map(entry => entry.query)

    // TODO: Implementiere Cluster-Analyse für ähnliche Fehler
    return [...new Set(failures)].slice(0, 5)
  }

  private generateOptimizedConfig(
    currentConfig: HandlerConfig,
    analysis: {
      successRate: number
      avgResponseTime: number
      avgConfidence: number
      avgUserRating: number
      commonFailures: string[]
    }
  ): HandlerConfig {
    const optimizedConfig = { ...currentConfig }

    // Passe Schwellenwerte basierend auf Performance an
    if (analysis.successRate < 0.8) {
      optimizedConfig.settings.matchThreshold = Math.max(
        0.6,
        optimizedConfig.settings.matchThreshold - 0.1
      )
    }

    if (analysis.avgResponseTime > 2.0) {
      optimizedConfig.settings.maxTokens = Math.max(
        100,
        optimizedConfig.settings.maxTokens - 25
      )
    }

    if (analysis.avgUserRating < 3.5) {
      optimizedConfig.settings.contextWindow = Math.min(
        5,
        optimizedConfig.settings.contextWindow + 1
      )
    }

    return optimizedConfig
  }

  public getFeedbackStats(handlerId: string): {
    totalRequests: number
    successRate: number
    avgResponseTime: number
    avgUserRating: number
  } {
    const history = this.feedbackHistory.get(handlerId) || []
    
    if (history.length === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        avgResponseTime: 0,
        avgUserRating: 0
      }
    }

    const analysis = this.analyzeFeedback(history)

    return {
      totalRequests: history.length,
      successRate: analysis.successRate,
      avgResponseTime: analysis.avgResponseTime,
      avgUserRating: analysis.avgUserRating
    }
  }
} 