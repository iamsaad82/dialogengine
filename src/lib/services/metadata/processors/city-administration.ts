import { BaseMetadataProcessor } from './base'
import { 
  PineconeCityAdministrationMetadata, 
  CityAdministrationMetadata,
  CityService,
  Department,
  Announcement,
  PublicSpace,
  Construction,
  WasteManagement,
  PublicTransport
} from '../../../types/pinecone'
import { 
  EnhancedMetadata,
  CityAdministrationDomainMetadata 
} from '../../../types/enhanced'
import { 
  StructuralElement,
  ListElement,
  TableElement
} from '../../../types/structural'

/**
 * Processor für Stadtverwaltungs-Metadaten
 */
export class CityAdministrationProcessor extends BaseMetadataProcessor {
  /**
   * Verarbeitet die Metadaten und transformiert sie in das erweiterte Format
   */
  async process(metadata: PineconeCityAdministrationMetadata): Promise<EnhancedMetadata> {
    // Validiere die Metadaten
    if (!this.validateMetadata(metadata)) {
      throw new Error('Ungültige Metadaten')
    }

    // Transformiere die Metadaten in das erweiterte Format
    const content = this.transformContent(metadata.cityAdmin)
    const additionalContent = this.transformAdditionalContent(metadata.cityAdmin)

    // Domain-spezifische Daten extrahieren
    const domainData = await this.extractDomainData(metadata.cityAdmin)

    return {
      id: metadata.id,
      type: metadata.type,
      title: metadata.title,
      content: content,
      language: metadata.language,
      source: metadata.source,
      tags: metadata.tags,
      lastModified: metadata.lastUpdated,
      domain: {
        cityAdmin: domainData
      }
    }
  }

  private validateMetadata(metadata: PineconeCityAdministrationMetadata): boolean {
    return (
      metadata.type === 'cityAdministration' &&
      metadata.cityAdmin !== undefined &&
      metadata.id !== undefined &&
      metadata.title !== undefined
    )
  }

  private transformContent(cityAdmin: CityAdministrationMetadata): StructuralElement[] {
    const content: StructuralElement[] = []

    // Füge Services hinzu
    if (cityAdmin.services?.length) {
      const serviceTable: TableElement = {
        type: 'table',
        content: 'Verfügbare Dienstleistungen',
        headers: ['Name', 'Abteilung', 'Standort'],
        rows: cityAdmin.services.map(service => [
          service.name,
          service.department,
          service.location
        ])
      }
      content.push(serviceTable)
    }

    // Füge Abteilungen hinzu
    if (cityAdmin.departments?.length) {
      const departmentList: ListElement = {
        type: 'list',
        content: 'Abteilungen',
        items: cityAdmin.departments.map(dept =>
          `${dept.name}\nZuständigkeiten: ${dept.responsibilities.join(', ')}\nStandort: ${dept.location}`
        )
      }
      content.push(departmentList)
    }

    // Füge aktuelle Ankündigungen hinzu
    if (cityAdmin.announcements?.length) {
      const announcementList: ListElement = {
        type: 'list',
        content: 'Aktuelle Ankündigungen',
        items: cityAdmin.announcements.map(announcement =>
          `${announcement.title} (${announcement.date})${announcement.validUntil ? ` - gültig bis ${announcement.validUntil}` : ''}`
        )
      }
      content.push(announcementList)
    }

    return content
  }

  private transformAdditionalContent(cityAdmin: CityAdministrationMetadata): StructuralElement[] {
    const additionalContent: StructuralElement[] = []

    // Füge Bauarbeiten hinzu
    if (cityAdmin.construction?.length) {
      const constructionList: ListElement = {
        type: 'list',
        content: 'Aktuelle Bauarbeiten',
        items: cityAdmin.construction.map(c =>
          `${c.project} in ${c.location}\nStatus: ${c.status}\nZeitraum: ${c.dates.start}${c.dates.end ? ` bis ${c.dates.end}` : ''}`
        )
      }
      additionalContent.push(constructionList)
    }

    // Füge Abfallmanagement hinzu
    if (cityAdmin.wasteManagement?.schedule) {
      const scheduleTable: TableElement = {
        type: 'table',
        content: 'Abfallentsorgung',
        headers: ['Art', 'Termin'],
        rows: Object.entries(cityAdmin.wasteManagement.schedule).map(([type, date]) => [type, date])
      }
      additionalContent.push(scheduleTable)
    }

    // Füge ÖPNV-Informationen hinzu
    if (cityAdmin.publicTransport?.lines?.length) {
      const transportTable: TableElement = {
        type: 'table',
        content: 'ÖPNV-Linien',
        headers: ['Linie', 'Typ', 'Route'],
        rows: cityAdmin.publicTransport.lines.map(line => [
          line.number,
          line.type,
          line.route.join(' → ')
        ])
      }
      additionalContent.push(transportTable)
    }

    if (cityAdmin.publicTransport?.updates?.length) {
      const updatesList: ListElement = {
        type: 'list',
        content: 'Aktuelle ÖPNV-Updates',
        items: cityAdmin.publicTransport.updates.map(update =>
          `Linie ${update.line}: ${update.message}`
        )
      }
      additionalContent.push(updatesList)
    }

    return additionalContent
  }

  private async extractDomainData(cityAdmin: CityAdministrationMetadata): Promise<CityAdministrationDomainMetadata> {
    return {
      services: cityAdmin.services?.map(s => ({
        name: s.name,
        department: s.department,
        location: s.location
      })) || [],
      
      departments: cityAdmin.departments?.map(d => ({
        name: d.name,
        responsibilities: d.responsibilities,
        location: d.location
      })) || [],
      
      announcements: cityAdmin.announcements?.map(a => ({
        title: a.title,
        date: a.date,
        type: this.normalizeAnnouncementType(a.type),
        content: a.content,
        validUntil: a.validUntil
      })) || [],
      
      publicSpaces: cityAdmin.publicSpaces?.map(p => ({
        name: p.name,
        type: this.normalizeSpaceType(p.type),
        location: p.location
      })) || []
    }
  }

  private normalizeAnnouncementType(type: string): 'public' | 'construction' | 'event' | 'emergency' | 'other' {
    const lowerType = type.toLowerCase()
    if (lowerType.includes('public')) return 'public'
    if (lowerType.includes('construction')) return 'construction'
    if (lowerType.includes('event')) return 'event'
    if (lowerType.includes('emergency')) return 'emergency'
    return 'other'
  }

  private normalizeSpaceType(type: string): 'park' | 'playground' | 'sports' | 'cultural' | 'other' {
    const lowerType = type.toLowerCase()
    if (lowerType.includes('park')) return 'park'
    if (lowerType.includes('playground')) return 'playground'
    if (lowerType.includes('sport')) return 'sports'
    if (lowerType.includes('cultural')) return 'cultural'
    return 'other'
  }
} 