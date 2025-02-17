import { PrismaClient } from '@prisma/client'
import Redis from 'ioredis'
import { DatabaseMonitoringService } from './monitoring/database-monitoring'
import { setupPrismaWithMonitoring } from './monitoring/prisma-middleware'
import { setupRedisWithMonitoring } from './monitoring/redis-middleware'

declare global {
  var prisma: PrismaClient | undefined
  var redis: Redis | undefined
  var dbMonitoring: DatabaseMonitoringService | undefined
}

// Prisma Client initialisieren
export const prisma = globalThis.prisma || new PrismaClient()

// Redis Client initialisieren
export const redis = globalThis.redis || new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0')
})

// Monitoring Service initialisieren
export const dbMonitoring = globalThis.dbMonitoring || new DatabaseMonitoringService({
  serviceName: 'dialog-engine',
  serviceVersion: process.env.APP_VERSION || '1.0.0',
  prisma,
  redis
})

// Monitoring für Prisma und Redis einrichten
setupPrismaWithMonitoring(prisma, dbMonitoring)
setupRedisWithMonitoring(redis, dbMonitoring)

// Globale Variablen im Entwicklungsmodus setzen
if (process.env.NODE_ENV === 'development') {
  globalThis.prisma = prisma
  globalThis.redis = redis
  globalThis.dbMonitoring = dbMonitoring
} 