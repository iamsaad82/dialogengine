import { ResponseHandlerFactory } from '../../../src/lib/services/response/handlers/factory'
import { CityAdministrationHandler } from '../../../src/lib/services/response/handlers/CityAdministrationHandler'
import { PineconeCityAdministrationMetadata } from '../../../src/lib/services/metadata/types/pinecone'
import { ContentTypeEnum } from '../../../src/lib/types/contentTypes'

describe('ResponseHandlerFactory', () => {
  let factory: ResponseHandlerFactory

  beforeEach(() => {
    // Factory zurücksetzen
    ResponseHandlerFactory.getInstance().clearHandlers()
    factory = ResponseHandlerFactory.getInstance()
  })

  const createTestMetadata = (): PineconeCityAdministrationMetadata => ({
    id: 'test-id',
    type: 'cityAdministration',
    title: 'Test Stadt',
    templateId: 'test-template',
    contentId: 'test-content',
    lastUpdated: new Date().toISOString(),
    language: 'de',
    source: 'test',
    tags: ['test'],
    cityAdmin: {
      services: [{
        name: 'Bürgerbüro',
        department: 'Bürgerservice',
        location: 'Rathaus'
      }],
      departments: [{
        name: 'Bürgerservice',
        responsibilities: ['Anmeldungen', 'Ausweise'],
        location: 'Rathaus'
      }],
      announcements: [{
        title: 'Stadtfest',
        date: new Date().toISOString(),
        type: 'event',
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }],
      publicSpaces: [{
        name: 'Stadtpark',
        type: 'park',
        location: 'Stadtmitte'
      }],
      construction: [{
        project: 'Straßensanierung',
        location: 'Hauptstraße',
        status: 'in_progress',
        dates: {
          start: new Date().toISOString(),
          end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      }],
      wasteManagement: {
        schedule: {
          'Restmüll': 'Montags',
          'Biomüll': 'Mittwochs'
        },
        recyclingCenters: [{
          name: 'Wertstoffhof Nord',
          location: 'Industriegebiet',
          materials: ['Papier', 'Glas', 'Metall']
        }]
      },
      publicTransport: {
        lines: [{
          number: '1',
          type: 'bus',
          route: ['Hauptbahnhof', 'Rathaus', 'Krankenhaus']
        }],
        updates: [{
          line: '1',
          type: 'delay',
          message: 'Verspätung wegen Baustelle'
        }]
      }
    }
  })

  describe('getInstance', () => {
    it('sollte immer die gleiche Instanz zurückgeben', () => {
      const instance1 = ResponseHandlerFactory.getInstance()
      const instance2 = ResponseHandlerFactory.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('getHandler', () => {
    const templateId = 'test-template'

    it('sollte einen CityAdministrationHandler für Stadtverwaltungs-Metadaten erstellen', () => {
      const metadata = createTestMetadata()
      const handler = factory.getHandler(templateId, metadata)
      expect(handler).toBeInstanceOf(CityAdministrationHandler)
    })

    it('sollte den gleichen Handler für das gleiche Template und den gleichen Typ wiederverwenden', () => {
      const metadata = createTestMetadata()
      const handler1 = factory.getHandler(templateId, metadata)
      const handler2 = factory.getHandler(templateId, metadata)
      expect(handler1).toBe(handler2)
    })

    it('sollte verschiedene Handler für verschiedene Templates erstellen', () => {
      const metadata = createTestMetadata()
      const handler1 = factory.getHandler('template1', metadata)
      const handler2 = factory.getHandler('template2', metadata)
      expect(handler1).not.toBe(handler2)
    })
  })

  describe('removeHandler', () => {
    const templateId = 'test-template'

    it('sollte einen registrierten Handler entfernen', () => {
      const metadata = createTestMetadata()
      const handler1 = factory.getHandler(templateId, metadata)
      factory.removeHandler(templateId, 'cityAdministration')
      const handler2 = factory.getHandler(templateId, metadata)
      expect(handler1).not.toBe(handler2)
    })
  })

  describe('clearHandlers', () => {
    it('sollte alle Handler entfernen', () => {
      const metadata = createTestMetadata()
      const handler1 = factory.getHandler('template1', metadata)
      const handler2 = factory.getHandler('template2', metadata)
      
      factory.clearHandlers()
      
      const handler3 = factory.getHandler('template1', metadata)
      const handler4 = factory.getHandler('template2', metadata)
      
      expect(handler1).not.toBe(handler3)
      expect(handler2).not.toBe(handler4)
    })
  })
})