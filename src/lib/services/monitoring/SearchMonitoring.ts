import { MonitoringService } from './monitoring'

export class SearchMonitoring {
  private monitoring: MonitoringService
  private activeConnections: number = 0

  constructor(templateId: string) {
    this.monitoring = new MonitoringService({
      serviceName: 'smart-search',
      serviceVersion: '1.0.0',
      labels: {
        templateId,
        environment: process.env.NODE_ENV || 'development'
      }
    })
  }

  public recordSearchStart(): void {
    this.activeConnections++
    this.monitoring.updateActiveConnections(this.activeConnections)
  }

  public recordSearchEnd(): void {
    this.activeConnections--
    this.monitoring.updateActiveConnections(this.activeConnections)
  }

  public recordLatency(duration: number, type: string): void {
    this.monitoring.recordSearchLatency(duration, type)
  }

  public recordSuccess(type: string): void {
    this.monitoring.recordSearchRequest('success', type)
  }

  public recordError(type: string, error: unknown): void {
    this.monitoring.recordError(type, error instanceof Error ? error.message : 'unknown')
    this.monitoring.recordSearchRequest('error', type)
  }

  public updateCacheHitRatio(hit: number, type: string): void {
    this.monitoring.updateCacheHitRatio(hit, type)
  }

  public recordHandlerUsage(handlerName: string, status: 'success' | 'error'): void {
    this.monitoring.recordHandlerUsage(handlerName, status)
  }

  public getActiveConnections(): number {
    return this.activeConnections
  }
} 