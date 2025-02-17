import { LoadBalancer } from '../../../../src/lib/services/load/LoadBalancer'
import { Redis } from 'ioredis'
import { SearchConfig } from '../../../../src/lib/services/search/types'

describe('LoadBalancer', () => {
  let loadBalancer: LoadBalancer
  let mockRedis: jest.Mocked<Redis>
  
  const mockConfig: SearchConfig = {
    openaiApiKey: 'test-key',
    pineconeApiKey: 'test-key',
    pineconeIndex: 'test-index',
    host: 'localhost',
    port: 3000,
    loadBalancing: {
      enabled: true,
      strategy: 'round-robin',
      healthCheck: {
        interval: 5000,
        timeout: 1000
      }
    }
  }

  beforeEach(() => {
    mockRedis = {
      hset: jest.fn(),
      hget: jest.fn(),
      hgetall: jest.fn(),
      del: jest.fn(),
      expire: jest.fn()
    } as unknown as jest.Mocked<Redis>

    loadBalancer = new LoadBalancer(mockConfig, mockRedis)
  })

  describe('Service Registration', () => {
    it('sollte einen neuen Service erfolgreich registrieren', async () => {
      const host = 'test-host'
      const port = 8080

      await loadBalancer.registerInstance(host, port)

      expect(mockRedis.hset).toHaveBeenCalledWith(
        expect.stringContaining('service:'),
        expect.objectContaining({
          host,
          port: port.toString(),
          status: 'active'
        })
      )
    })

    it('sollte einen Service als inaktiv markieren, wenn Health Check fehlschlägt', async () => {
      const host = 'test-host'
      const port = 8080

      await loadBalancer.registerInstance(host, port)
      await loadBalancer.markServiceUnhealthy({ host, port, status: 'active', lastHeartbeat: Date.now() })

      expect(mockRedis.hset).toHaveBeenCalledWith(
        expect.stringContaining('service:'),
        'status',
        'unhealthy'
      )
    })
  })

  describe('Service Selection', () => {
    it('sollte Round-Robin Strategie korrekt anwenden', async () => {
      const services = [
        { host: 'host1', port: 8081, status: 'active', lastHeartbeat: Date.now() },
        { host: 'host2', port: 8082, status: 'active', lastHeartbeat: Date.now() }
      ]

      mockRedis.hgetall.mockResolvedValue({
        'service:host1:8081': JSON.stringify(services[0]),
        'service:host2:8082': JSON.stringify(services[1])
      })

      const service1 = await loadBalancer.selectService()
      const service2 = await loadBalancer.selectService()
      const service3 = await loadBalancer.selectService()

      expect(service1?.host).toBe('host1')
      expect(service2?.host).toBe('host2')
      expect(service3?.host).toBe('host1')
    })

    it('sollte nur aktive Services auswählen', async () => {
      const services = [
        { host: 'host1', port: 8081, status: 'active', lastHeartbeat: Date.now() },
        { host: 'host2', port: 8082, status: 'unhealthy', lastHeartbeat: Date.now() }
      ]

      mockRedis.hgetall.mockResolvedValue({
        'service:host1:8081': JSON.stringify(services[0]),
        'service:host2:8082': JSON.stringify(services[1])
      })

      const selectedService = await loadBalancer.selectService()
      expect(selectedService?.host).toBe('host1')
    })
  })

  describe('Health Checks', () => {
    it('sollte Health Checks in regelmäßigen Abständen durchführen', async () => {
      jest.useFakeTimers()

      const checkServicesSpy = jest.spyOn(loadBalancer as any, 'checkServicesHealth')
      
      loadBalancer['startHealthChecks']()
      
      jest.advanceTimersByTime(5000)
      
      expect(checkServicesSpy).toHaveBeenCalled()
      
      jest.useRealTimers()
    })

    it('sollte Services als unhealthy markieren, wenn Heartbeat zu alt ist', async () => {
      const oldHeartbeat = Date.now() - 60000 // 1 Minute alt
      const services = [
        { 
          host: 'host1', 
          port: 8081, 
          status: 'active', 
          lastHeartbeat: oldHeartbeat 
        }
      ]

      mockRedis.hgetall.mockResolvedValue({
        'service:host1:8081': JSON.stringify(services[0])
      })

      await loadBalancer['checkServicesHealth'](services)

      expect(mockRedis.hset).toHaveBeenCalledWith(
        'service:host1:8081',
        'status',
        'unhealthy'
      )
    })
  })
}) 