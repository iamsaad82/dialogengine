import { CityAdministrationHandler } from '../../../src/lib/services/response/handlers/CityAdministrationHandler'
import { HandlerContext } from '../../../src/lib/services/response/handlers/base'
import { PineconeCityAdministrationMetadata, PineconeShoppingCenterMetadata } from '../../../src/lib/services/metadata/types/pinecone'

describe('CityAdministrationHandler', () => {
  let handler: CityAdministrationHandler
  const templateId = 'test-template'
  const defaultConfig = {
    type: 'city-administration',
    searchFields: ['service', 'description'],
    responseTemplate: '{"type":"{{type}}","text":"{{text}}"}',
    validationRules: {
      type: 'city-administration',
      required: ['service'],
      validation: {}
    }
  }

  beforeEach(() => {
    handler = new CityAdministrationHandler(templateId, defaultConfig)
  })

  const mockData = {
    type: 'city-administration' as const,
    templateId: 'test-template',
    contentId: 'test-content',
    lastUpdated: new Date().toISOString(),
    language: 'de',
    cityAdmin: {
      service: 'Anmeldung',
      services: [{
        name: 'Bürgerservice',
        description: 'Allgemeine Verwaltungsaufgaben',
        category: 'Verwaltung',
        availability: 'Mo-Fr 9-18 Uhr'
      }],
      lastUpdated: new Date().toISOString(),
      location: 'Rathaus',
      openingHours: 'Mo-Fr 9-18 Uhr',
      contactInfo: 'buergerservice@stadt.de',
      requirements: ['Personalausweis'],
      fees: 'keine',
      processingTime: '1-2 Werktage',
      additionalInfo: 'Bitte Termin vereinbaren'
    }
  }

  const metadata: PineconeCityAdministrationMetadata = mockData

  describe('canHandle', () => {
    it('sollte true zurückgeben für Stadtverwaltungs-Metadaten', () => {
      expect(handler.canHandle(metadata)).toBe(true)
    })

    it('sollte false zurückgeben für andere Metadaten-Typen', () => {
      const otherMetadata: PineconeShoppingCenterMetadata = {
        type: 'shopping-center' as const,
        templateId: 'test-template',
        contentId: 'test-content',
        lastUpdated: new Date().toISOString(),
        language: 'de',
        shoppingCenter: {
          news: [{
            title: 'Neue Shops',
            date: new Date().toISOString(),
            type: 'update'
          }],
          offers: [{
            shop: 'TestShop',
            title: 'Sonderangebot',
            validFrom: new Date().toISOString()
          }],
          services: [{
            name: 'Info-Point',
            location: 'Erdgeschoss',
            type: 'information'
          }],
          shops: [{
            name: 'TestShop',
            category: 'Mode',
            location: 'Erdgeschoss',
            floor: 'EG'
          }],
          facilities: ['Toiletten', 'Parkplatz'],
          events: [{
            title: 'Verkaufsoffener Sonntag',
            date: new Date().toISOString(),
            type: 'special'
          }],
          openingHours: ['Mo-Sa 10-20 Uhr'],
          accessibility: ['Rollstuhlgerecht']
        }
      }
      expect(handler.canHandle(otherMetadata)).toBe(false)
    })
  })

  describe('generateResponse', () => {
    it('sollte eine passende Antwort für Service-Anfragen generieren', async () => {
      const serviceMetadata = {
        ...mockData,
        cityAdmin: {
          ...mockData.cityAdmin,
          service: 'Führerschein',
          services: [{
            name: 'Führerscheinstelle',
            description: 'Führerscheinangelegenheiten',
            category: 'Verkehr',
            availability: 'Mo-Fr 9-16 Uhr'
          }]
        }
      }

      const context: HandlerContext = {
        metadata: serviceMetadata,
        query: 'Wo kann ich meinen Führerschein beantragen?'
      }

      const response = await handler.generateResponse(context)
      expect(response).toBeDefined()
    })

    it('sollte eine Standardantwort für unbekannte Anfragen generieren', async () => {
      const context: HandlerContext = {
        metadata,
        query: 'xyz123'
      }

      const response = await handler.generateResponse(context)
      expect(response).toBeDefined()
    })
  })
}) 