import { Redis } from 'ioredis'
import { DatabaseMonitoringService } from './database-monitoring'

type RedisCommand = {
  name: string
  args: any[]
  callback?: (err: Error | null, result: any) => void
}

export function createRedisMiddleware(monitoring: DatabaseMonitoringService) {
  return {
    transformCommand(command: RedisCommand): RedisCommand {
      const startTime = process.hrtime()
      const originalCallback = command.callback

      command.callback = (err: Error | null, result: any) => {
        // Latenz berechnen
        const hrtime = process.hrtime(startTime)
        const duration = hrtime[0] + hrtime[1] / 1e9

        // Operation aufzeichnen
        monitoring.recordRedisOperation(
          command.name,
          err === null
        )

        // Latenz aufzeichnen
        monitoring.recordRedisLatency(
          command.name,
          duration
        )

        // Original-Callback aufrufen
        if (originalCallback) {
          originalCallback(err, result)
        }
      }

      return command
    }
  }
}

export function setupRedisWithMonitoring(
  redis: Redis,
  monitoring: DatabaseMonitoringService
): void {
  const middleware = createRedisMiddleware(monitoring)
  redis.on('beforeCommand', (command: RedisCommand) => {
    middleware.transformCommand(command)
  })
} 