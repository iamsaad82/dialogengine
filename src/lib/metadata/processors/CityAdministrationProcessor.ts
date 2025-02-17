import { BaseMetadataProcessor } from './base'
import { PineconeCityAdministrationMetadata, CityAdministrationMetadata } from '../types/pinecone'
import { EnhancedMetadata } from '../types/enhanced'
import { StructuralElement } from '../types/structural'

export class CityAdministrationProcessor extends BaseMetadataProcessor {
  async process(metadata: PineconeCityAdministrationMetadata): Promise<EnhancedMetadata> {
    // Validiere die Metadaten
    if (!this.validateMetadata(metadata)) {
      throw new Error('Ungültige Metadaten')
    }

    // Transformiere die Metadaten in das erweiterte Format
    return {
      id: metadata.id,
      type: metadata.type,
      title: metadata.title,
      content: this.transformContent(metadata.cityAdmin),
      additionalContent: this.transformAdditionalContent(metadata.cityAdmin),
      language: metadata.language || 'de',
      source: metadata.source || 'city_administration',
      tags: metadata.tags || [],
      lastModified: metadata.lastModified || new Date().toISOString()
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
      content.push({
        type: 'list',
        content: 'Verfügbare Dienstleistungen:',
        items: cityAdmin.services.map(service =>
          `${service.name} (${service.department})`
        )
      })
    }

    // Füge Abteilungen hinzu
    if (cityAdmin.departments?.length) {
      content.push({
        type: 'list',
        content: 'Abteilungen:',
        items: cityAdmin.departments.map(dept =>
          `${dept.name}\nKontakt: ${dept.contact}`
        )
      })
    }

    // Füge aktuelle Ankündigungen hinzu
    if (cityAdmin.announcements?.length) {
      content.push({
        type: 'list',
        content: 'Aktuelle Ankündigungen:',
        items: cityAdmin.announcements.map(announcement =>
          `${announcement.title} (${announcement.type})`
        )
      })
    }

    return content
  }

  private transformAdditionalContent(cityAdmin: CityAdministrationMetadata): StructuralElement[] {
    const additionalContent: StructuralElement[] = []

    // Füge Bauarbeiten hinzu
    if (cityAdmin.construction?.length) {
      additionalContent.push({
        type: 'list',
        content: 'Aktuelle Bauarbeiten:',
        items: cityAdmin.construction.map(c =>
          `${c.type} in ${c.location}\n${c.description}`
        )
      })
    }

    // Füge Abfallmanagement hinzu
    if (cityAdmin.wasteManagement) {
      const waste = cityAdmin.wasteManagement
      if (waste.generalInfo || waste.collectionSchedule?.length) {
        const items: string[] = []
        if (waste.generalInfo) {
          items.push(waste.generalInfo)
        }
        if (waste.collectionSchedule?.length) {
          items.push(...waste.collectionSchedule.map(s =>
            `${s.type}: ${s.nextCollection}`
          ))
        }
        additionalContent.push({
          type: 'list',
          content: 'Abfallentsorgung:',
          items
        })
      }
    }

    // Füge ÖPNV-Informationen hinzu
    if (cityAdmin.publicTransport) {
      const transport = cityAdmin.publicTransport
      if (transport.generalInfo || transport.disruptions?.length) {
        const items: string[] = []
        if (transport.generalInfo) {
          items.push(transport.generalInfo)
        }
        if (transport.disruptions?.length) {
          items.push(...transport.disruptions.map(d =>
            `${d.type}: ${d.description}`
          ))
        }
        additionalContent.push({
          type: 'list',
          content: 'ÖPNV:',
          items
        })
      }
    }

    return additionalContent
  }
} 