import { HandlerRegistry } from '../../../src/lib/services/response/handlers/registry'
import { MonitoringService } from '../../../src/lib/monitoring/monitoring'
import { HandlerConfig } from '../../../src/lib/types/HandlerConfig'
import { IResponseHandler } from '../../../src/lib/services/response/handlers/base'

// Mock für MonitoringService
const mockMonitoring = {
  recordHandlerCall: jest.fn(),
  recordHandlerLatency: jest.fn(),
  recordABTestMetrics: jest.fn(),
  recordSearchRequest: jest.fn(),
  recordSearchLatency: jest.fn(),
  recordError: jest.fn(),
  updateCacheHitRatio: jest.fn(),
  updateActiveConnections: jest.fn(),
  getMetrics: jest.fn()
} as unknown as MonitoringService

// Mock für einen Test-Handler
class MockHandler implements IResponseHandler {
  constructor(private config: HandlerConfig) {}

  canHandle(): boolean {
    return true
  }

  async generateResponse() {
    return {
      type: 'test',
      text: 'Test Response',
      confidence: 0.8,
      metadata: {
        source: 'test',
        timestamp: new Date().toISOString()
      }
    }
  }

  getConfig(): HandlerConfig {
    return this.config
  }
}

describe('HandlerRegistry', () => {
  let registry: HandlerRegistry
  let mockConfig: HandlerConfig
  let mockHandler: IResponseHandler

  beforeEach(() => {
    registry = new HandlerRegistry(mockMonitoring)
    mockConfig = {
      type: 'medical',
      searchFields: ['title', 'description'],
      responseTemplate: '{"type":"{{type}}","text":"{{text}}"}',
      validationRules: {
        type: 'medical',
        required: [],
        validation: {}
      }
    }
    mockHandler = new MockHandler(mockConfig)
    jest.clearAllMocks()
  })

  describe('Handler-Registrierung', () => {
    it('sollte einen neuen Handler erfolgreich registrieren', () => {
      expect(() => {
        registry.registerHandler('medical', 'v1', mockHandler, mockConfig)
      }).not.toThrow()

      const handler = registry.getHandler('medical')
      expect(handler).toBeDefined()
      expect(mockMonitoring.recordHandlerCall).toHaveBeenCalledWith('medical', true)
    })

    it('sollte einen Fehler bei ungültigem Handler-Typ werfen', () => {
      expect(() => {
        registry.registerHandler('invalid-type', 'v1', mockHandler, mockConfig)
      }).toThrow('Ungültiger Handler-Typ')
    })

    it('sollte mehrere Versionen des gleichen Handlers verwalten können', () => {
      registry.registerHandler('medical', 'v1', mockHandler, mockConfig)
      registry.registerHandler('medical', 'v2', mockHandler, mockConfig)

      const versions = registry.getHandlerVersions('medical')
      expect(versions).toContain('v1')
      expect(versions).toContain('v2')
    })
  })

  describe('Handler-Versionierung', () => {
    beforeEach(() => {
      registry.registerHandler('medical', 'v1', mockHandler, mockConfig)
      registry.registerHandler('medical', 'v2', mockHandler, mockConfig)
    })

    it('sollte die aktive Version korrekt setzen und abrufen', () => {
      registry.setActiveVersion('medical', 'v2')
      expect(registry.getActiveVersion('medical')).toBe('v2')
    })

    it('sollte einen Fehler werfen bei nicht existierender Version', () => {
      expect(() => {
        registry.setActiveVersion('medical', 'v999')
      }).toThrow('Version v999 für Handler medical nicht gefunden')
    })

    it('sollte die Handler-Konfiguration aktualisieren können', () => {
      const newConfig = {
        searchFields: ['newField']
      }
      registry.updateHandler('medical', 'v1', newConfig)
      const handler = registry.getHandler('medical', 'v1')
      expect(handler?.getConfig().searchFields).toContain('newField')
    })
  })

  describe('Konfliktmanagement', () => {
    beforeEach(() => {
      registry.registerHandler('medical', 'v1', mockHandler, mockConfig)
      registry.registerHandler('medical', 'v2', mockHandler, {
        ...mockConfig,
        searchFields: ['different']
      })
    })

    it('sollte Konflikte zwischen Versionen erkennen', () => {
      const hasConflict = registry.checkConflicts('medical', 'v1', 'v2')
      expect(hasConflict).toBe(false)
    })

    it('sollte keine aktive Version löschen können', () => {
      expect(() => {
        registry.removeVersion('medical', registry.getActiveVersion('medical')!)
      }).toThrow('Aktive Version')
    })

    it('sollte inaktive Versionen löschen können', () => {
      registry.setActiveVersion('medical', 'v2')
      registry.removeVersion('medical', 'v1')
      expect(registry.getHandlerVersions('medical')).not.toContain('v1')
    })
  })

  describe('Versionsverwaltung', () => {
    it('sollte alte Versionen automatisch bereinigen', () => {
      // Registriere mehrere Versionen
      for (let i = 1; i <= 7; i++) {
        registry.registerHandler('medical', `v${i}`, mockHandler, mockConfig)
      }

      registry.setActiveVersion('medical', 'v7')
      registry.cleanupOldVersions('medical', 3)

      const versions = registry.getHandlerVersions('medical')
      expect(versions.length).toBeLessThanOrEqual(3)
      expect(versions).toContain('v7') // Aktive Version sollte erhalten bleiben
    })

    it('sollte die neuesten Versionen bei der Bereinigung behalten', () => {
      const versions = ['v1', 'v2', 'v3', 'v4', 'v5']
      versions.forEach(version => {
        registry.registerHandler('medical', version, mockHandler, mockConfig)
      })

      registry.cleanupOldVersions('medical', 3)
      const remainingVersions = registry.getHandlerVersions('medical')
      
      expect(remainingVersions).toContain('v5')
      expect(remainingVersions).toContain('v4')
      expect(remainingVersions).toContain('v3')
      expect(remainingVersions).not.toContain('v2')
      expect(remainingVersions).not.toContain('v1')
    })
  })
}) 