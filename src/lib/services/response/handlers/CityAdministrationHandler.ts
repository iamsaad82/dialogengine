import { BaseResponseHandler, HandlerContext, HandlerResponse } from './base'
import { PineconeMetadata, PineconeCityAdministrationMetadata, isCityAdministrationMetadata } from '../../metadata/types/pinecone'
import { CityAdministrationProcessor } from '../../metadata/processors'
import { HandlerConfig } from '../../../types/HandlerConfig'

type QueryIntent = {
  type: 'service' | 'general'
  specific: boolean
  keywords: string[]
  location?: string
  date?: string
}

export class CityAdministrationHandler extends BaseResponseHandler {
  private readonly processor: CityAdministrationProcessor

  constructor(templateId: string, config: HandlerConfig) {
    super(templateId, config)
    this.processor = new CityAdministrationProcessor(templateId)
  }

  canHandle(metadata: PineconeMetadata): boolean {
    return isCityAdministrationMetadata(metadata)
  }

  async generateResponse(context: HandlerContext): Promise<HandlerResponse> {
    if (!context.metadata || !isCityAdministrationMetadata(context.metadata)) {
      return this.getDefaultResponse(context)
    }

    try {
      // Verarbeite die Metadaten
      const processedMetadata = await this.processor.process({
        ...context.metadata,
        type: 'cityAdministration',
        id: context.metadata.contentId,
        title: context.metadata.cityAdmin.service,
        source: 'city-administration',
        tags: [],
        lastModified: new Date().toISOString(),
        cityAdmin: {
          ...context.metadata.cityAdmin,
          department: context.metadata.cityAdmin.department || 'Allgemein',
          location: context.metadata.cityAdmin.location || 'Unbekannt',
          contactInfo: {
            email: 'info@stadt.de',
            address: context.metadata.cityAdmin.location || 'Unbekannt',
            phone: context.metadata.cityAdmin.contactInfo || undefined
          }
        }
      })
      
      if (!processedMetadata) {
        return this.getDefaultResponse(context)
      }

      // Analysiere die Query nach Schlüsselwörtern
      const queryIntent = this.analyzeCityAdminQuery(context.query.toLowerCase())
      
      // Generiere die passende Antwort
      let response = ''
      let confidence = 0.7 // Basis-Konfidenz

      switch (queryIntent.type) {
        case 'service':
          response = this.generateServiceResponse(context.metadata.cityAdmin.services, queryIntent)
          confidence = queryIntent.specific ? 0.9 : 0.7
          break
          
        default:
          response = this.generateGeneralCityAdminResponse(context.metadata.cityAdmin)
          confidence = 0.6
      }

      const handlerResponse: HandlerResponse = {
        type: 'info',
        text: response,
        confidence,
        metadata: {
          source: 'city_administration',
          intent: queryIntent,
          timestamp: new Date().toISOString()
        }
      }

      return {
        ...handlerResponse,
        confidence: this.calculateConfidence(handlerResponse, context)
      }

    } catch (error) {
      console.error('Fehler bei der Handler-Verarbeitung:', error)
      return this.getDefaultResponse(context)
    }
  }

  private analyzeCityAdminQuery(query: string): QueryIntent {
    const keywords: string[] = []
    let type: QueryIntent['type'] = 'general'
    let specific = false

    // Extrahiere Location
    const locationMatch = query.match(/(?:in|bei|am|im)\s+([^?.,]+)/)
    const location = locationMatch ? locationMatch[1].trim() : undefined

    // Extrahiere Datum
    const dateMatch = query.match(/(?:am|ab|seit|bis)\s+(\d{1,2}\.\d{1,2}\.\d{4})/)
    const date = dateMatch ? dateMatch[1] : undefined

    // Bestimme den Typ basierend auf Keywords
    if (this.containsAny(query, ['dienst', 'service', 'leistung', 'angebot', 'beantrag'])) {
      type = 'service'
      specific = this.containsAny(query, ['pass', 'ausweis', 'anmeld', 'ummeld'])
    }

    return { type, specific, keywords, location, date }
  }

  private generateServiceResponse(
    services: PineconeCityAdministrationMetadata['cityAdmin']['services'],
    intent: QueryIntent
  ): string {
    if (!services?.length) {
      return 'Aktuell sind keine Dienstleistungen verfügbar.'
    }

    // Filtere nach Keywords wenn spezifisch
    const relevantServices = intent.specific
      ? services.filter(s => 
          this.containsAny(s.name.toLowerCase(), intent.keywords) ||
          (s.description && this.containsAny(s.description.toLowerCase(), intent.keywords))
        )
      : services

    if (relevantServices.length === 0) {
      return 'Leider konnte ich keine passenden Dienstleistungen finden.'
    }

    return relevantServices.map(service =>
      `${service.name}\n` +
      (service.description ? `${service.description}\n` : '') +
      (service.category ? `Kategorie: ${service.category}\n` : '') +
      (service.availability ? `Verfügbarkeit: ${service.availability}\n` : '')
    ).join('\n\n')
  }

  private generateGeneralCityAdminResponse(
    cityAdmin: PineconeCityAdministrationMetadata['cityAdmin']
  ): string {
    const parts: string[] = []

    // Hauptservice
    if (cityAdmin.service) {
      parts.push(`Hauptservice: ${cityAdmin.service}`)
    }

    // Verfügbare Services
    if (cityAdmin.services?.length) {
      parts.push('\nVerfügbare Services:')
      parts.push(
        cityAdmin.services.slice(0, 3).map(s =>
          `- ${s.name}${s.description ? `: ${s.description}` : ''}`
        ).join('\n')
      )
      if (cityAdmin.services.length > 3) {
        parts.push('... und weitere Services')
      }
    }

    // Standort und Öffnungszeiten
    if (cityAdmin.location || cityAdmin.openingHours) {
      parts.push('\nStandort & Öffnungszeiten:')
      if (cityAdmin.location) parts.push(`Standort: ${cityAdmin.location}`)
      if (cityAdmin.openingHours) parts.push(`Öffnungszeiten: ${cityAdmin.openingHours}`)
    }

    // Kontakt
    if (cityAdmin.contactInfo) {
      parts.push(`\nKontakt: ${cityAdmin.contactInfo}`)
    }

    // Zusätzliche Informationen
    if (cityAdmin.additionalInfo) {
      parts.push(`\nWeitere Informationen: ${cityAdmin.additionalInfo}`)
    }

    return parts.join('\n')
  }
} 