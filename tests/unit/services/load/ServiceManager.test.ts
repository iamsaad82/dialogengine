import { ServiceManager } from '../../../../src/lib/services/load/ServiceManager'
import { Redis } from 'ioredis'
import { SearchConfig, SearchContext, SearchOptions } from '../../../../src/lib/services/search/types'

describe('ServiceManager', () => {
  let serviceManager: ServiceManager
  let mockRedis: jest.Mocked<Redis>

  const mockConfig = {
    redis: {} as Redis,
    searchConfig: {
      openaiApiKey: 'test-key',
      pineconeApiKey: 'test-key',
      pineconeIndex: 'test-index',
      host: 'localhost',
      port: 3000
    } as SearchConfig,
    healthCheckInterval: 5000,
    drainTimeout: 10000,
    maxCpuThreshold: 80,
    maxMemoryThreshold: 80,
    maxConnectionsThreshold: 1000,
    retryAttempts: 3,
    retryDelay: 1000
  }

  beforeEach(() => {
    mockRedis = {
      hset: jest.fn(),
      hget: jest.fn(),
      hgetall: jest.fn(),
      del: jest.fn(),
      expire: jest.fn()
    } as unknown as jest.Mocked<Redis>

    mockConfig.redis = mockRedis
    serviceManager = new ServiceManager(mockConfig)
  })

  describe('Initialisierung', () => {
    it('sollte eine neue Service-Instanz erfolgreich initialisieren', async () => {
      const host = 'test-host'
      const port = 8080

      await serviceManager.initialize(host, port)

      expect(mockRedis.hset).toHaveBeenCalledWith(
        expect.stringContaining('service:'),
        expect.objectContaining({
          host,
          port: port.toString(),
          status: 'active'
        })
      )
    })

    it('sollte bei fehlgeschlagener Initialisierung einen Fehler werfen', async () => {
      const host = 'test-host'
      const port = 8080

      mockRedis.hset.mockRejectedValue(new Error('Redis Fehler'))

      await expect(serviceManager.initialize(host, port))
        .rejects
        .toThrow('Redis Fehler')
    })
  })

  describe('Suche', () => {
    const mockContext: SearchContext = {
      query: 'test query',
      templateId: 'test-template'
    }

    const mockOptions: SearchOptions = {
      maxResults: 10,
      threshold: 0.7
    }

    it('sollte eine Suchanfrage erfolgreich verarbeiten', async () => {
      const mockResponse = {
        answer: 'Test Antwort',
        confidence: 0.9
      }

      // Mock für die interne Suchfunktion
      jest.spyOn(serviceManager as any, 'performSearch')
        .mockResolvedValue(mockResponse)

      const result = await serviceManager.search(mockContext, mockOptions)

      expect(result).toEqual(mockResponse)
    })

    it('sollte bei Fehlern automatisch wiederholen', async () => {
      const mockError = new Error('Temporärer Fehler')
      const mockResponse = {
        answer: 'Test Antwort',
        confidence: 0.9
      }

      const performSearchSpy = jest.spyOn(serviceManager as any, 'performSearch')
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValue(mockResponse)

      const result = await serviceManager.search(mockContext, mockOptions)

      expect(performSearchSpy).toHaveBeenCalledTimes(3)
      expect(result).toEqual(mockResponse)
    })
  })

  describe('Shutdown', () => {
    it('sollte den Service ordnungsgemäß herunterfahren', async () => {
      await serviceManager.shutdown()

      expect(mockRedis.hset).toHaveBeenCalledWith(
        expect.stringContaining('service:'),
        'status',
        'draining'
      )

      expect(mockRedis.del).toHaveBeenCalled()
    })

    it('sollte während des Drainings keine neuen Anfragen annehmen', async () => {
      const shutdownPromise = serviceManager.shutdown()
      
      const searchPromise = serviceManager.search({
        query: 'test',
        templateId: 'test'
      })

      await expect(searchPromise).rejects.toThrow('Service wird heruntergefahren')
      await shutdownPromise
    })
  })
}) 