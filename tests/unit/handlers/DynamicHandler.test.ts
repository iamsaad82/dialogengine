import { HandlerGenerator } from '../../../src/lib/handlers/HandlerGenerator'
import { MonitoringService } from '../../../src/lib/monitoring/monitoring'
import { ContentMetadata } from '../../../src/lib/types/ContentMetadata'
import { HandlerConfig } from '../../../src/lib/types/HandlerConfig'
import { BaseHandler } from '../../../src/lib/handlers/BaseHandler'

describe('DynamicHandler', () => {
  let handlerGenerator: HandlerGenerator
  let monitoring: MonitoringService
  
  beforeEach(() => {
    monitoring = new MonitoringService({
      serviceName: 'test-service',
      serviceVersion: '1.0.0'
    })
    
    handlerGenerator = new HandlerGenerator(
      'test-openai-key',
      monitoring
    )
  })

  describe('Handler-Generierung', () => {
    it('sollte einen Handler für medizinische Inhalte generieren', async () => {
      const metadata: ContentMetadata = {
        type: 'medical',
        title: 'Behandlung von Kopfschmerzen',
        description: 'Informationen über verschiedene Arten von Kopfschmerzen und deren Behandlung',
        requirements: 'Medizinische Fachbegriffe, Symptombeschreibungen, Behandlungsoptionen'
      }

      const handler = await handlerGenerator.generateHandler(metadata)
      expect(handler).toBeInstanceOf(BaseHandler)
      
      const config = handlerGenerator.getHandlerConfig('medical')
      expect(config).toBeDefined()
      expect(config?.type).toBe('medical')
      expect(config?.searchFields).toContain('symptoms')
      expect(config?.searchFields).toContain('treatment')
    })

    it('sollte einen Handler für Versicherungsinhalte generieren', async () => {
      const metadata: ContentMetadata = {
        type: 'insurance',
        title: 'Krankenversicherungsleistungen',
        description: 'Übersicht über Leistungen und Bedingungen',
        requirements: 'Versicherungsbedingungen, Leistungskatalog, Erstattungsprozess'
      }

      const handler = await handlerGenerator.generateHandler(metadata)
      expect(handler).toBeInstanceOf(BaseHandler)
      
      const config = handlerGenerator.getHandlerConfig('insurance')
      expect(config).toBeDefined()
      expect(config?.type).toBe('insurance')
      expect(config?.searchFields).toContain('coverage')
      expect(config?.searchFields).toContain('requirements')
    })

    it('sollte einen Handler für Stadtverwaltungsinhalte generieren', async () => {
      const metadata: ContentMetadata = {
        type: 'cityAdministration',
        title: 'Bürgerservice Anmeldung',
        description: 'Informationen zur Anmeldung und erforderlichen Dokumenten',
        requirements: 'Verwaltungsprozesse, Formulare, Öffnungszeiten'
      }

      const handler = await handlerGenerator.generateHandler(metadata)
      expect(handler).toBeInstanceOf(BaseHandler)
      
      const config = handlerGenerator.getHandlerConfig('cityAdministration')
      expect(config).toBeDefined()
      expect(config?.type).toBe('cityAdministration')
      expect(config?.searchFields).toContain('service')
      expect(config?.searchFields).toContain('location')
    })
  })

  describe('Handler-Validierung', () => {
    it('sollte die Metadaten korrekt validieren', async () => {
      const metadata: ContentMetadata = {
        type: 'medical',
        title: 'Test',
        description: 'Test Description',
        requirements: 'Medizinische Anforderungen'
      }

      const handler = await handlerGenerator.generateHandler(metadata)
      expect(handler.validateMetadata(metadata)).toBe(true)
    })

    it('sollte ungültige Metadaten erkennen', async () => {
      const invalidMetadata: ContentMetadata = {
        type: 'unknown',
        title: '',
        description: '',
      }

      await expect(handlerGenerator.generateHandler(invalidMetadata))
        .rejects.toThrow()
    })
  })

  describe('Handler-Konfiguration', () => {
    it('sollte die Handler-Konfiguration korrekt speichern', async () => {
      const metadata: ContentMetadata = {
        type: 'medical',
        title: 'Test',
        description: 'Test Description',
        requirements: 'Test Requirements'
      }

      await handlerGenerator.generateHandler(metadata)
      expect(handlerGenerator.hasHandler('medical')).toBe(true)
      
      const config = handlerGenerator.getHandlerConfig('medical')
      expect(config).toBeDefined()
      expect(config?.type).toBe('medical')
    })
  })

  describe('Performance-Monitoring', () => {
    it('sollte Handler-Nutzung korrekt aufzeichnen', async () => {
      const metadata: ContentMetadata = {
        type: 'medical',
        title: 'Test',
        description: 'Test Description',
        requirements: 'Test Requirements'
      }

      const handler = await handlerGenerator.generateHandler(metadata)
      const recordHandlerUsageSpy = jest.spyOn(monitoring, 'recordHandlerUsage')
      
      await handler.validateMetadata(metadata)
      
      expect(recordHandlerUsageSpy).toHaveBeenCalledWith(
        'medical',
        'success'
      )
    })

    it('sollte Fehler korrekt aufzeichnen', async () => {
      const recordErrorSpy = jest.spyOn(monitoring, 'recordError')
      
      const invalidMetadata: ContentMetadata = {
        type: 'unknown',
        title: '',
        description: '',
      }

      try {
        await handlerGenerator.generateHandler(invalidMetadata)
      } catch (error) {
        // Erwarteter Fehler
      }

      expect(recordErrorSpy).toHaveBeenCalledWith(
        'handler_generation',
        'invalid_metadata'
      )
    })

    it('sollte Performance-Metriken für Handler-Generierung aufzeichnen', async () => {
      const recordSearchLatencySpy = jest.spyOn(monitoring, 'recordSearchLatency')
      
      const metadata: ContentMetadata = {
        type: 'medical',
        title: 'Test',
        description: 'Test Description',
        requirements: 'Test Requirements'
      }

      const startTime = Date.now()
      await handlerGenerator.generateHandler(metadata)
      const duration = (Date.now() - startTime) / 1000 // Konvertiere zu Sekunden

      expect(recordSearchLatencySpy).toHaveBeenCalledWith(
        expect.any(Number),
        'medical'
      )
      
      // Überprüfe, ob die aufgezeichnete Dauer plausibel ist
      const recordedDuration = recordSearchLatencySpy.mock.calls[0][0]
      expect(recordedDuration).toBeGreaterThan(0)
      expect(recordedDuration).toBeLessThan(duration + 0.1) // Kleine Toleranz
    })
  })
})

describe('DynamicHandler Cache-Performance', () => {
  let monitoring: MonitoringService
  let handlerGenerator: HandlerGenerator
  
  beforeEach(() => {
    monitoring = new MonitoringService({
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      collectDefaultMetrics: false
    })
    
    handlerGenerator = new HandlerGenerator('test-key', monitoring)
  })

  it('sollte Cache-Trefferquote korrekt aufzeichnen', async () => {
    const mockMetrics = jest.spyOn(monitoring, 'updateCacheHitRatio')
    
    const metadata: ContentMetadata = {
      type: 'test',
      title: 'Test Handler',
      description: 'Test Description'
    }
    
    // Ersten Handler generieren (Cache Miss)
    await handlerGenerator.generateHandler(metadata)
    
    // Zweiten Handler mit gleichen Metadaten generieren (Cache Hit)
    await handlerGenerator.generateHandler(metadata)
    
    expect(mockMetrics).toHaveBeenCalledWith(expect.any(Number), 'local')
    expect(mockMetrics.mock.calls[0][0]).toBe(0) // Erster Aufruf: 0% Cache-Hits
    expect(mockMetrics.mock.calls[1][0]).toBe(100) // Zweiter Aufruf: 100% Cache-Hits
  })

  it('sollte Handler-Generierungszeit messen', async () => {
    const mockLatency = jest.spyOn(monitoring, 'recordSearchLatency')
    
    const metadata: ContentMetadata = {
      type: 'test',
      title: 'Test Handler',
      description: 'Test Description'
    }
    
    await handlerGenerator.generateHandler(metadata)
    
    expect(mockLatency).toHaveBeenCalledWith(
      expect.any(Number),
      'test'
    )
    expect(mockLatency.mock.calls[0][0]).toBeGreaterThan(0)
  })

  it('sollte Handler-Nutzung korrekt aufzeichnen', async () => {
    const mockUsage = jest.spyOn(monitoring, 'recordHandlerUsage')
    
    const metadata: ContentMetadata = {
      type: 'test',
      title: 'Test Handler',
      description: 'Test Description'
    }
    
    await handlerGenerator.generateHandler(metadata)
    
    expect(mockUsage).toHaveBeenCalledWith(
      'test',
      'success'
    )
  })

  it('sollte Fehler bei der Handler-Generierung aufzeichnen', async () => {
    const mockError = jest.spyOn(monitoring, 'recordError')
    const mockUsage = jest.spyOn(monitoring, 'recordHandlerUsage')
    
    const invalidMetadata: ContentMetadata = {
      type: '', // Ungültiger Typ
      title: '',
      description: ''
    }
    
    try {
      await handlerGenerator.generateHandler(invalidMetadata)
    } catch (error) {
      // Erwarteter Fehler
    }
    
    expect(mockError).toHaveBeenCalledWith(
      'handler_generation',
      expect.any(String)
    )
    expect(mockUsage).toHaveBeenCalledWith(
      '',
      'error'
    )
  })
})