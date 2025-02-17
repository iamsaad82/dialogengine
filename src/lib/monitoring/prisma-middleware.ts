import { PrismaClient } from '@prisma/client'
import { DatabaseMonitoringService } from './database-monitoring'

export function createPrismaMiddleware(monitoring: DatabaseMonitoringService) {
  return async (
    params: any,
    next: (params: any) => Promise<any>
  ) => {
    const startTime = process.hrtime()
    
    try {
      // Query ausführen
      const result = await next(params)
      
      // Erfolgreiche Query aufzeichnen
      monitoring.recordQuery(
        params.action,
        params.model || 'unknown',
        true
      )
      
      // Latenz berechnen und aufzeichnen
      const hrtime = process.hrtime(startTime)
      const duration = hrtime[0] + hrtime[1] / 1e9
      await monitoring.recordQueryLatency(
        params.action,
        params.model || 'unknown',
        duration
      )
      
      return result
    } catch (error) {
      // Fehlgeschlagene Query aufzeichnen
      monitoring.recordQuery(
        params.action,
        params.model || 'unknown',
        false
      )
      
      throw error
    }
  }
}

export function setupPrismaWithMonitoring(
  prisma: PrismaClient,
  monitoring: DatabaseMonitoringService
): void {
  prisma.$use(createPrismaMiddleware(monitoring))
} 