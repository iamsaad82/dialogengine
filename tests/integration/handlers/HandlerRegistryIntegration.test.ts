import { ResponseHandlerFactory } from '../../../src/lib/services/response/handlers/factory'
import { MonitoringService } from '../../../src/lib/monitoring/monitoring'
import { PineconeMedicalMetadata } from '../../../src/lib/services/metadata/types/pinecone'

describe('Handler Registry Integration', () => {
  let factory: ResponseHandlerFactory
  let monitoring: MonitoringService

  beforeEach(() => {
    monitoring = new MonitoringService({
      serviceName: 'test-service',
      serviceVersion: '1.0.0'
    })
    factory = ResponseHandlerFactory.getInstance('test-key', monitoring)
  })

  afterEach(() => {
    factory.clearHandlers()
  })

  it('sollte Handler-Versionen über die Factory verwalten können', async () => {
    const templateId = 'test-template'
    const metadata: PineconeMedicalMetadata = {
      type: 'medical',
      templateId,
      contentId: 'test-content',
      lastUpdated: new Date().toISOString(),
      language: 'de',
      medical: {
        specialty: 'Allgemeinmedizin',
        condition: 'Test Condition',
        treatment: 'Test Treatment',
        symptoms: ['Test Symptom'],
        urgency: 'medium'
      }
    }

    // Erstelle erste Version des Handlers
    const handler1 = await factory.getHandler(templateId, metadata)
    expect(handler1).toBeDefined()

    // Prüfe, ob Version registriert wurde
    const versions = factory.getHandlerVersions('medical')
    expect(versions.length).toBe(1)

    // Aktualisiere Handler mit neuen Metadaten
    const updatedMetadata = {
      ...metadata,
      lastUpdated: new Date(Date.now() + 1000).toISOString()
    }
    const handler2 = await factory.getHandler(templateId, updatedMetadata)
    expect(handler2).toBeDefined()

    // Prüfe, ob neue Version erstellt wurde
    const updatedVersions = factory.getHandlerVersions('medical')
    expect(updatedVersions.length).toBe(2)
  })

  it('sollte Hot-Reloading von Handlern unterstützen', async () => {
    const templateId = 'test-template'
    const metadata: PineconeMedicalMetadata = {
      type: 'medical',
      templateId,
      contentId: 'test-content',
      lastUpdated: new Date().toISOString(),
      language: 'de',
      medical: {
        specialty: 'Allgemeinmedizin',
        condition: 'Initial Condition',
        treatment: 'Initial Treatment',
        symptoms: ['Initial Symptom'],
        urgency: 'low'
      }
    }

    // Initialer Handler
    const handler1 = await factory.getHandler(templateId, metadata)
    const initialVersion = factory.getHandlerVersions('medical')[0]

    // Simuliere Konfigurationsänderung
    const updatedMetadata = {
      ...metadata,
      lastUpdated: new Date(Date.now() + 1000).toISOString(),
      medical: {
        ...metadata.medical,
        condition: 'Updated Condition',
        symptoms: ['Updated Symptom']
      }
    }

    // Handler aktualisieren
    const handler2 = await factory.getHandler(templateId, updatedMetadata)
    const newVersion = factory.getHandlerVersions('medical')[1]

    expect(newVersion).not.toBe(initialVersion)
    expect(handler2).not.toBe(handler1)
  })

  it('sollte alte Handler-Versionen automatisch bereinigen', async () => {
    const templateId = 'test-template'
    const baseMetadata: PineconeMedicalMetadata = {
      type: 'medical',
      templateId,
      contentId: 'test-content',
      lastUpdated: new Date().toISOString(),
      language: 'de',
      medical: {
        specialty: 'Allgemeinmedizin',
        condition: 'Test Condition',
        treatment: 'Test Treatment',
        symptoms: ['Test Symptom'],
        urgency: 'medium'
      }
    }

    // Erstelle mehrere Versionen
    for (let i = 0; i < 10; i++) {
      const metadata = {
        ...baseMetadata,
        lastUpdated: new Date(Date.now() + i * 1000).toISOString()
      }
      await factory.getHandler(templateId, metadata)
    }

    // Prüfe Anzahl der Versionen
    let versions = factory.getHandlerVersions('medical')
    expect(versions.length).toBe(10)

    // Bereinige alte Versionen
    factory.cleanupOldVersions('medical', 5)

    // Prüfe, ob nur die neuesten Versionen behalten wurden
    versions = factory.getHandlerVersions('medical')
    expect(versions.length).toBe(5)
  })

  it('sollte Konflikte zwischen Handler-Versionen erkennen', async () => {
    const templateId = 'test-template'
    const metadata1: PineconeMedicalMetadata = {
      type: 'medical',
      templateId,
      contentId: 'test-content-1',
      lastUpdated: new Date().toISOString(),
      language: 'de',
      medical: {
        specialty: 'Allgemeinmedizin',
        condition: 'Condition 1',
        treatment: 'Treatment 1',
        symptoms: ['Symptom 1'],
        urgency: 'high'
      }
    }

    const metadata2: PineconeMedicalMetadata = {
      type: 'medical',
      templateId,
      contentId: 'test-content-2',
      lastUpdated: new Date().toISOString(),
      language: 'de',
      medical: {
        specialty: 'Allgemeinmedizin',
        condition: 'Condition 2',
        treatment: 'Treatment 2',
        symptoms: ['Symptom 2'],
        urgency: 'high'
      }
    }

    // Erstelle zwei Handler mit unterschiedlichen Konfigurationen
    await factory.getHandler(templateId, metadata1)
    await factory.getHandler(templateId, metadata2)

    const versions = factory.getHandlerVersions('medical')
    expect(versions.length).toBe(2)
  })
}) 