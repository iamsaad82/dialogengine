import { SmartSearch } from '../core/search'
import { SearchConfig, SearchContext, SearchOptions } from '../types'
import { Redis } from 'ioredis'
import { OpenAI } from 'openai'
import { Pinecone } from '@pinecone-database/pinecone'
import { MonitoringService } from '../../../monitoring/monitoring'

// Mock-Implementierungen
jest.mock('ioredis')
jest.mock('openai')
jest.mock('@pinecone-database/pinecone')
jest.mock('../../../monitoring/monitoring')

describe('SmartSearch', () => {
  let smartSearch: SmartSearch
  let mockConfig: SearchConfig
  let mockRedis: jest.Mocked<Redis>
  let mockOpenAI: jest.Mocked<OpenAI>
  let mockPinecone: jest.Mocked<Pinecone>
  let mockMonitoring: jest.Mocked<MonitoringService>

  beforeEach(() => {
    // Mock-Konfiguration
    mockConfig = {
      openaiApiKey: 'test-key',
      pineconeApiKey: 'test-key',
      pineconeIndex: 'test-index',
      templateId: 'test-template',
      redis: {
        host: 'localhost',
        port: 6379
      }
    }

    // Mock-Instanzen zurücksetzen
    mockRedis = new Redis() as jest.Mocked<Redis>
    mockOpenAI = new OpenAI() as jest.Mocked<OpenAI>
    mockPinecone = new Pinecone() as jest.Mocked<Pinecone>
    mockMonitoring = new MonitoringService({
      serviceName: 'smart-search-test',
      serviceVersion: '1.0.0',
      collectDefaultMetrics: true,
      labels: {
        templateId: 'test-template',
        environment: 'test'
      }
    }) as jest.Mocked<MonitoringService>

    // SmartSearch-Instanz erstellen
    smartSearch = new SmartSearch(mockConfig)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Initialisierung', () => {
    it('sollte eine neue Instanz mit der gegebenen Konfiguration erstellen', () => {
      expect(smartSearch).toBeInstanceOf(SmartSearch)
    })

    it('sollte die externen Services korrekt initialisieren', () => {
      expect(Redis).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379,
        password: undefined,
        db: 0
      })
    })
  })

  describe('Health Checks', () => {
    it('sollte initial als gesund markiert sein', () => {
      expect(smartSearch.isHealthy()).toBe(true)
    })

    it('sollte Verbindungen akzeptieren wenn System gesund', () => {
      expect(smartSearch.canAcceptConnections()).toBe(true)
    })
  })

  describe('Cache Management', () => {
    const mockContext: SearchContext = {
      query: 'test query',
      templateId: 'test-template'
    }

    beforeEach(() => {
      mockRedis.get.mockResolvedValue(null)
      mockRedis.set.mockResolvedValue('OK')
    })

    it('sollte den Cache korrekt prüfen', async () => {
      const mockResponse = {
        answer: 'test answer',
        confidence: 0.9
      }

      // Cache Miss simulieren
      mockRedis.get.mockResolvedValueOnce(null)
      
      // Antwort cachen
      await smartSearch['cacheResponse']('test-key', mockResponse)

      expect(mockRedis.set).toHaveBeenCalled()
    })
  })

  describe('Suche', () => {
    const mockContext: SearchContext = {
      query: 'test query',
      templateId: 'test-template'
    }

    const mockOptions: SearchOptions = {
      maxResults: 5,
      threshold: 0.7
    }

    it('sollte eine Suche erfolgreich durchführen', async () => {
      const mockResponse = {
        answer: 'test answer',
        confidence: 0.9
      }

      // Mock für erfolgreiche Suche
      mockRedis.get.mockResolvedValue(null)
      
      const result = await smartSearch.search(mockContext, mockOptions)
      
      expect(result).toBeDefined()
      expect(mockMonitoring.recordSearchLatency).toHaveBeenCalled()
      expect(mockMonitoring.recordSearchRequest).toHaveBeenCalled()
    })

    it('sollte Fehler korrekt behandeln', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'))

      await expect(smartSearch.search(mockContext, mockOptions))
        .rejects
        .toThrow()
      
      expect(mockMonitoring.recordError).toHaveBeenCalled()
    })
  })
}) 