import { ContextManager } from '../../context/ContextManager'
import { Redis } from 'ioredis'
import { SearchContext } from '../types'

jest.mock('ioredis')

describe('ContextManager', () => {
  let contextManager: ContextManager
  let mockRedis: jest.Mocked<Redis>

  beforeEach(() => {
    mockRedis = new Redis() as jest.Mocked<Redis>
    
    contextManager = new ContextManager({
      maxHistoryLength: 10,
      contextTtl: 3600,
      similarityThreshold: 0.7,
      redis: mockRedis
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Kontext-Verwaltung', () => {
    const mockContext: SearchContext = {
      query: 'test query',
      templateId: 'test-template',
      history: [
        {
          content: 'previous message',
          role: 'user',
          timestamp: new Date().toISOString()
        }
      ]
    }

    it('sollte einen neuen Kontext erstellen', async () => {
      const sessionId = 'test-session'
      mockRedis.hset.mockResolvedValue(1)

      await contextManager.saveContext(sessionId, mockContext)

      expect(mockRedis.hset).toHaveBeenCalled()
    })

    it('sollte einen existierenden Kontext laden', async () => {
      const sessionId = 'test-session'
      mockRedis.hgetall.mockResolvedValue({
        context: JSON.stringify(mockContext)
      })

      const loadedContext = await contextManager.loadContext(sessionId)

      expect(loadedContext).toBeDefined()
      expect(loadedContext.templateId).toBe(mockContext.templateId)
    })

    it('sollte den Kontext aktualisieren', async () => {
      const sessionId = 'test-session'
      const updatedContext = {
        ...mockContext,
        query: 'updated query'
      }

      mockRedis.hset.mockResolvedValue(1)

      await contextManager.updateContext(sessionId, updatedContext)

      expect(mockRedis.hset).toHaveBeenCalled()
    })

    it('sollte den Kontext löschen', async () => {
      const sessionId = 'test-session'
      mockRedis.del.mockResolvedValue(1)

      await contextManager.clearContext(sessionId)

      expect(mockRedis.del).toHaveBeenCalled()
    })
  })

  describe('History Management', () => {
    it('sollte die History auf maximale Länge begrenzen', async () => {
      const sessionId = 'test-session'
      const longHistory = Array(15).fill({
        content: 'message',
        role: 'user',
        timestamp: new Date().toISOString()
      })

      const context: SearchContext = {
        query: 'test',
        templateId: 'test',
        history: longHistory
      }

      mockRedis.hset.mockResolvedValue(1)
      await contextManager.updateContext(sessionId, context)

      const updatedContext = await contextManager.loadContext(sessionId)
      expect(updatedContext.history?.length).toBeLessThanOrEqual(10)
    })

    it('sollte Timestamps korrekt verarbeiten', async () => {
      const sessionId = 'test-session'
      const context: SearchContext = {
        query: 'test',
        templateId: 'test',
        history: [{
          content: 'message',
          role: 'user'
        }]
      }

      mockRedis.hset.mockResolvedValue(1)
      await contextManager.updateContext(sessionId, context)

      const updatedContext = await contextManager.loadContext(sessionId)
      expect(updatedContext.history?.[0].timestamp).toBeDefined()
    })
  })

  describe('Fehlerbehandlung', () => {
    it('sollte Redis-Fehler abfangen', async () => {
      const sessionId = 'test-session'
      mockRedis.hgetall.mockRejectedValue(new Error('Redis error'))

      await expect(contextManager.loadContext(sessionId))
        .rejects
        .toThrow('Redis error')
    })

    it('sollte bei ungültigem JSON einen Fehler werfen', async () => {
      const sessionId = 'test-session'
      mockRedis.hgetall.mockResolvedValue({
        context: 'invalid-json'
      })

      await expect(contextManager.loadContext(sessionId))
        .rejects
        .toThrow()
    })
  })
}) 