import { CityAdministrationProcessor } from '../../../src/lib/services/metadata/processors/city-administration'
import { PineconeCityAdministrationMetadata } from '../../../src/lib/types/pinecone'
import { EnhancedMetadata } from '../../../src/lib/types/enhanced'
import { TableElement, ListElement } from '../../../src/lib/types/structural'

describe('CityAdministrationProcessor', () => {
  let processor: CityAdministrationProcessor
  const templateId = 'test-template'

  beforeEach(() => {
    processor = new CityAdministrationProcessor(templateId)
  })

  const createTestMetadata = (override: Partial<PineconeCityAdministrationMetadata> = {}): PineconeCityAdministrationMetadata => ({
    id: 'test-id',
    type: 'cityAdministration',
    title: 'Test Stadt',
    templateId,
    contentId: 'test-content',
    lastUpdated: new Date().toISOString(),
    lastModified: new Date().toISOString(),
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
        content: 'Großes Stadtfest mit Live-Musik',
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
    },
    ...override
  })

  describe('process', () => {
    it('sollte Pinecone-Metadaten erfolgreich in erweitertes Format umwandeln', async () => {
      const metadata = createTestMetadata()
      const result = await processor.process(metadata)

      expect(result).toBeDefined()
      expect(result.type).toBe('cityAdministration')
      expect(result.content).toBeInstanceOf(Array)
      expect(result.content.length).toBeGreaterThan(0)
      expect(result.lastModified).toBe(metadata.lastUpdated)
    })

    it('sollte Dienste korrekt als Tabelle darstellen', async () => {
      const metadata = createTestMetadata()
      const result = await processor.process(metadata)

      const serviceTable = result.content.find(
        element => element.type === 'table' && element.content.includes('Dienstleistungen')
      ) as TableElement

      expect(serviceTable).toBeDefined()
      expect(serviceTable.headers).toEqual(['Name', 'Abteilung', 'Standort'])
      expect(serviceTable.rows[0]).toEqual(['Bürgerbüro', 'Bürgerservice', 'Rathaus'])
    })

    it('sollte Abteilungen korrekt als Liste darstellen', async () => {
      const metadata = createTestMetadata()
      const result = await processor.process(metadata)

      const departmentList = result.content.find(
        element => element.type === 'list' && element.content === 'Abteilungen'
      ) as ListElement

      expect(departmentList).toBeDefined()
      expect(departmentList.items[0]).toContain('Bürgerservice')
      expect(departmentList.items[0]).toContain('Anmeldungen, Ausweise')
    })

    it('sollte Ankündigungen korrekt als Liste darstellen', async () => {
      const metadata = createTestMetadata()
      const result = await processor.process(metadata)

      const announcementList = result.content.find(
        element => element.type === 'list' && element.content === 'Aktuelle Ankündigungen'
      ) as ListElement

      expect(announcementList).toBeDefined()
      expect(announcementList.items[0]).toContain('Stadtfest')
      expect(announcementList.items[0]).toContain('gültig bis')
    })

    it('sollte Bauarbeiten korrekt als Liste darstellen', async () => {
      const metadata = createTestMetadata()
      const result = await processor.process(metadata)

      const constructionList = result.content.find(
        element => element.type === 'list' && element.content === 'Aktuelle Bauarbeiten'
      ) as ListElement

      expect(constructionList).toBeDefined()
      expect(constructionList.items[0]).toContain('Straßensanierung')
      expect(constructionList.items[0]).toContain('in_progress')
    })

    it('sollte Abfallmanagement korrekt als Tabelle darstellen', async () => {
      const metadata = createTestMetadata()
      const result = await processor.process(metadata)

      const wasteTable = result.content.find(
        element => element.type === 'table' && element.content === 'Abfallentsorgung'
      ) as TableElement

      expect(wasteTable).toBeDefined()
      expect(wasteTable.headers).toEqual(['Art', 'Termin'])
      expect(wasteTable.rows).toContainEqual(['Restmüll', 'Montags'])
      expect(wasteTable.rows).toContainEqual(['Biomüll', 'Mittwochs'])
    })

    it('sollte ÖPNV-Informationen korrekt als Tabelle und Liste darstellen', async () => {
      const metadata = createTestMetadata()
      const result = await processor.process(metadata)

      const transportTable = result.content.find(
        element => element.type === 'table' && element.content === 'ÖPNV-Linien'
      ) as TableElement

      expect(transportTable).toBeDefined()
      expect(transportTable.headers).toEqual(['Linie', 'Typ', 'Route'])
      expect(transportTable.rows[0][0]).toBe('1')
      expect(transportTable.rows[0][1]).toBe('bus')

      const updatesList = result.content.find(
        element => element.type === 'list' && element.content === 'Aktuelle ÖPNV-Updates'
      ) as ListElement

      expect(updatesList).toBeDefined()
      expect(updatesList.items[0]).toContain('Linie 1')
      expect(updatesList.items[0]).toContain('Verspätung wegen Baustelle')
    })
  })

  describe('Validierung', () => {
    it('sollte ungültige Metadaten erkennen', async () => {
      const invalidMetadata = createTestMetadata()
      invalidMetadata.cityAdmin = {
        services: [],
        departments: [],
        announcements: [],
        publicSpaces: [],
        construction: [],
        wasteManagement: { schedule: {} },
        publicTransport: { lines: [], updates: [] }
      }

      await expect(processor.process(invalidMetadata)).rejects.toThrow('Ungültige Metadaten')
    })

    it('sollte fehlende Pflichtfelder erkennen', async () => {
      const invalidMetadata = createTestMetadata()
      delete (invalidMetadata as any).id
      delete (invalidMetadata as any).title

      await expect(processor.process(invalidMetadata)).rejects.toThrow('Ungültige Metadaten')
    })

    it('sollte leere Arrays in der Domain akzeptieren', async () => {
      const metadata = createTestMetadata({
        cityAdmin: {
          services: [],
          departments: [],
          announcements: [],
          publicSpaces: [],
          construction: [],
          wasteManagement: { schedule: {} },
          publicTransport: { lines: [], updates: [] }
        }
      })

      const result = await processor.process(metadata)
      expect(result).toBeDefined()
      expect(result.content).toHaveLength(0)
    })
  })
}) 