import { ContentType } from '../../../types/contentTypes'
import { PineconeMetadata, PineconeCityAdministrationMetadata, isCityAdministrationMetadata } from '../../metadata/types/pinecone'
import { 
  isMedicalMetadata, 
  isInsuranceMetadata, 
  isCommerceMetadata,
  isShoppingCenterMetadata 
} from '../../metadata/types/pinecone'
import { 
  MedicalMetadataProcessor,
  InsuranceMetadataProcessor,
  CommerceMetadataProcessor,
  ShoppingCenterProcessor,
  CityAdministrationProcessor
} from '../../metadata/processors'
import { EnhancedMetadata } from '../../metadata/types/enhanced'
import { ProcessedMetadata } from '../../metadata/types/pinecone'
import { StructuralElement } from '../../metadata/types/structural'
import { DomainMetadata, DomainType } from '../../metadata/types/pinecone'

interface HandlerResponse {
  type: ContentType
  text: string
  confidence: number
  metadata?: Record<string, any>
}

interface HandlerContext {
  query: string
  templateId: string
  metadata?: PineconeMetadata
  previousResponses?: HandlerResponse[]
}

/**
 * Basis-Handler für domänenspezifische Antwortgenerierung
 */
export class ResponseHandler {
  private readonly processors = {
    medical: new MedicalMetadataProcessor(this.templateId),
    insurance: new InsuranceMetadataProcessor(this.templateId),
    commerce: new CommerceMetadataProcessor(this.templateId),
    shoppingCenter: new ShoppingCenterProcessor(this.templateId),
    cityAdministration: new CityAdministrationProcessor(this.templateId)
  }

  constructor(
    private readonly templateId: string
  ) {}

  /**
   * Generiert eine domänenspezifische Antwort
   */
  async generateResponse(context: HandlerContext): Promise<HandlerResponse> {
    // Bestimme den passenden Processor
    const processor = await this.determineProcessor(context)
    if (!processor) {
      return this.getDefaultResponse(context)
    }

    try {
      // Verarbeite die Metadaten
      const processedMetadata = await this.processMetadata(context.metadata)
      
      // Generiere die Antwort basierend auf den verarbeiteten Metadaten
      const response = await this.generateDomainResponse(
        context.query,
        processedMetadata,
        context
      )

      return {
        ...response,
        confidence: this.calculateConfidence(response, context)
      }
    } catch (error) {
      console.error('Fehler bei der Handler-Verarbeitung:', error)
      return this.getDefaultResponse(context)
    }
  }

  /**
   * Bestimmt den passenden Processor basierend auf den Metadaten
   */
  private async determineProcessor(context: HandlerContext) {
    const metadata = context.metadata

    if (!metadata) return null

    if (isMedicalMetadata(metadata)) {
      return this.processors.medical
    }
    
    if (isInsuranceMetadata(metadata)) {
      return this.processors.insurance
    }
    
    if (isCommerceMetadata(metadata)) {
      return this.processors.commerce
    }
    
    if (isShoppingCenterMetadata(metadata)) {
      return this.processors.shoppingCenter
    }

    if (isCityAdministrationMetadata(metadata)) {
      return this.processors.cityAdministration
    }

    return null
  }

  /**
   * Verarbeitet die Metadaten mit dem passenden Prozessor
   */
  private async processMetadata(metadata: DomainMetadata): Promise<EnhancedMetadata | null> {
    const processor = this.getProcessorForType(metadata.type)
    if (!processor || !metadata) return null

    try {
      const processed = await processor.process(metadata) as ProcessedMetadata
      if (!processed) return null

      const content = Array.isArray(processed.content) 
        ? processed.content 
        : [{ type: 'paragraph', content: processed.content } as StructuralElement]

      const additionalContent = processed.additionalContent
        ? Array.isArray(processed.additionalContent)
          ? processed.additionalContent
          : [{ type: 'paragraph', content: processed.additionalContent } as StructuralElement]
        : undefined

      return {
        id: metadata.id,
        type: metadata.type,
        title: metadata.title,
        content,
        additionalContent,
        language: processed.language,
        source: processed.source,
        tags: processed.tags,
        lastModified: processed.lastModified
      }
    } catch (error) {
      console.error('Fehler bei der Metadaten-Verarbeitung:', error)
      return null
    }
  }

  /**
   * Ermittelt den passenden Prozessor für einen Metadaten-Typ
   */
  private getProcessorForType(type: DomainType) {
    const processorMap = {
      medical: this.processors.medical,
      insurance: this.processors.insurance,
      commerce: this.processors.commerce,
      shoppingCenter: this.processors.shoppingCenter,
      cityAdministration: this.processors.cityAdministration
    } as const

    return processorMap[type]
  }

  /**
   * Generiert eine domänenspezifische Antwort
   */
  private async generateDomainResponse(
    query: string,
    metadata: PineconeMetadata,
    context: HandlerContext
  ): Promise<HandlerResponse> {
    // Implementiere die domänenspezifische Logik
    if (isMedicalMetadata(metadata)) {
      return this.generateMedicalResponse(query, metadata)
    }
    
    if (isInsuranceMetadata(metadata)) {
      return this.generateInsuranceResponse(query, metadata)
    }
    
    if (isCommerceMetadata(metadata)) {
      return this.generateCommerceResponse(query, metadata)
    }
    
    if (isShoppingCenterMetadata(metadata)) {
      return this.generateShoppingCenterResponse(query, metadata)
    }

    if (isCityAdministrationMetadata(metadata)) {
      return this.generateCityAdministrationResponse(query, metadata)
    }

    return this.getDefaultResponse(context)
  }

  /**
   * Generiert eine medizinische Antwort
   */
  private async generateMedicalResponse(
    query: string,
    metadata: PineconeMetadata
  ): Promise<HandlerResponse> {
    // TODO: Implementiere medizinische Antwortgenerierung
    throw new Error('Medizinische Antwortgenerierung noch nicht implementiert')
  }

  /**
   * Generiert eine Versicherungs-Antwort
   */
  private async generateInsuranceResponse(
    query: string,
    metadata: PineconeMetadata
  ): Promise<HandlerResponse> {
    // TODO: Implementiere Versicherungs-Antwortgenerierung
    throw new Error('Versicherungs-Antwortgenerierung noch nicht implementiert')
  }

  /**
   * Generiert eine Commerce-Antwort
   */
  private async generateCommerceResponse(
    query: string,
    metadata: PineconeMetadata
  ): Promise<HandlerResponse> {
    // TODO: Implementiere Commerce-Antwortgenerierung
    throw new Error('Commerce-Antwortgenerierung noch nicht implementiert')
  }

  /**
   * Generiert eine Shopping-Center-Antwort
   */
  private async generateShoppingCenterResponse(
    query: string,
    metadata: PineconeMetadata
  ): Promise<HandlerResponse> {
    // TODO: Implementiere Shopping-Center-Antwortgenerierung
    throw new Error('Shopping-Center-Antwortgenerierung noch nicht implementiert')
  }

  /**
   * Generiert eine Stadtverwaltungs-Antwort
   */
  private async generateCityAdministrationResponse(
    query: string,
    metadata: PineconeCityAdministrationMetadata
  ): Promise<HandlerResponse> {
    // Extrahiere relevante Informationen
    const { cityAdmin } = metadata
    
    // Analysiere die Query nach Schlüsselwörtern
    const queryIntent = this.analyzeCityAdminQuery(query.toLowerCase())
    
    // Generiere die passende Antwort
    let response = ''
    let confidence = 0.7 // Basis-Konfidenz

    switch (queryIntent.type) {
      case 'service':
        response = this.generateServiceResponse(cityAdmin.services, queryIntent)
        confidence = queryIntent.specific ? 0.9 : 0.7
        break
        
      case 'department':
        response = this.generateDepartmentResponse(cityAdmin.departments, queryIntent)
        confidence = queryIntent.specific ? 0.9 : 0.7
        break
        
      case 'announcement':
        response = this.generateAnnouncementResponse(cityAdmin.announcements, queryIntent)
        confidence = queryIntent.specific ? 0.9 : 0.7
        break
        
      case 'publicSpace':
        response = this.generatePublicSpaceResponse(cityAdmin.publicSpaces, queryIntent)
        confidence = queryIntent.specific ? 0.9 : 0.7
        break
        
      case 'construction':
        response = this.generateConstructionResponse(cityAdmin.construction, queryIntent)
        confidence = queryIntent.specific ? 0.9 : 0.7
        break
        
      case 'waste':
        response = this.generateWasteResponse(cityAdmin.wasteManagement, queryIntent)
        confidence = queryIntent.specific ? 0.9 : 0.7
        break
        
      case 'transport':
        response = this.generateTransportResponse(cityAdmin.publicTransport, queryIntent)
        confidence = queryIntent.specific ? 0.9 : 0.7
        break
        
      default:
        response = this.generateGeneralCityAdminResponse(cityAdmin)
        confidence = 0.6
    }

    return {
      type: 'info',
      text: response,
      confidence,
      metadata: {
        source: 'city_administration',
        intent: queryIntent,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Analysiert die Query nach Stadtverwaltungs-spezifischen Intentionen
   */
  private analyzeCityAdminQuery(query: string): {
    type: 'service' | 'department' | 'announcement' | 'publicSpace' | 'construction' | 'waste' | 'transport' | 'general'
    specific: boolean
    keywords: string[]
    location?: string
    date?: string
  } {
    const keywords: string[] = []
    let type: 'service' | 'department' | 'announcement' | 'publicSpace' | 'construction' | 'waste' | 'transport' | 'general' = 'general'
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
    
    if (this.containsAny(query, ['amt', 'behörde', 'abteilung', 'dezernat'])) {
      type = 'department'
      specific = this.containsAny(query, ['zuständig', 'verantwortlich'])
    }
    
    if (this.containsAny(query, ['ankündigung', 'mitteilung', 'bekanntmachung', 'information'])) {
      type = 'announcement'
      specific = this.containsAny(query, ['aktuell', 'neu', 'wichtig'])
    }
    
    if (this.containsAny(query, ['park', 'spielplatz', 'sportanlage', 'einrichtung'])) {
      type = 'publicSpace'
      specific = !!location
    }
    
    if (this.containsAny(query, ['bau', 'arbeit', 'sperrung', 'sanierung'])) {
      type = 'construction'
      specific = !!location || !!date
    }
    
    if (this.containsAny(query, ['müll', 'abfall', 'entsorgen', 'recycling'])) {
      type = 'waste'
      specific = this.containsAny(query, ['abhol', 'termin', 'container'])
    }
    
    if (this.containsAny(query, ['bus', 'bahn', 'linie', 'haltestelle', 'fahrplan'])) {
      type = 'transport'
      specific = this.containsAny(query, ['verspätung', 'ausfall', 'umleitung'])
    }

    return { type, specific, keywords, location, date }
  }

  /**
   * Generiert spezifische Antworten für verschiedene Bereiche
   */
  private generateServiceResponse(
    services: PineconeCityAdministrationMetadata['cityAdmin']['services'],
    intent: ReturnType<typeof this.analyzeCityAdminQuery>
  ): string {
    if (!services?.length) {
      return 'Leider konnte ich keine passenden Dienstleistungen finden.'
    }

    const relevantServices = this.filterByKeywords(services, intent.keywords)
    
    if (relevantServices.length === 0) {
      return `Ich habe ${services.length} Dienstleistungen gefunden, aber keine passt zu Ihrer Anfrage.`
    }

    return relevantServices.map(service => 
      `${service.name} (${service.department})\n` +
      `Standort: ${service.location}`
    ).join('\n\n')
  }

  private generateDepartmentResponse(
    departments: PineconeCityAdministrationMetadata['cityAdmin']['departments'],
    intent: ReturnType<typeof this.analyzeCityAdminQuery>
  ): string {
    if (!departments?.length) {
      return 'Leider konnte ich keine passenden Abteilungen finden.'
    }

    const relevantDepts = this.filterByKeywords(departments, intent.keywords)
    
    if (relevantDepts.length === 0) {
      return `Ich habe ${departments.length} Abteilungen gefunden, aber keine passt zu Ihrer Anfrage.`
    }

    return relevantDepts.map(dept =>
      `${dept.name}\n` +
      `Zuständig für: ${dept.responsibilities.join(', ')}\n` +
      `Standort: ${dept.location}`
    ).join('\n\n')
  }

  private generateAnnouncementResponse(
    announcements: PineconeCityAdministrationMetadata['cityAdmin']['announcements'],
    intent: ReturnType<typeof this.analyzeCityAdminQuery>
  ): string {
    if (!announcements?.length) {
      return 'Aktuell liegen keine Bekanntmachungen vor.'
    }

    // Filtere nach Datum wenn angegeben
    const filteredAnnouncements = intent.date
      ? announcements.filter((a: { date: string }) => this.isDateRelevant(a.date, intent.date!))
      : announcements

    if (filteredAnnouncements.length === 0) {
      return 'Für den angegebenen Zeitraum liegen keine Bekanntmachungen vor.'
    }

    return filteredAnnouncements.map(announcement =>
      `[${announcement.type.toUpperCase()}] ${announcement.title}\n` +
      `Datum: ${this.formatDate(announcement.date)}\n` +
      (announcement.validUntil ? `Gültig bis: ${this.formatDate(announcement.validUntil)}\n` : '')
    ).join('\n\n')
  }

  private generatePublicSpaceResponse(
    spaces: PineconeCityAdministrationMetadata['cityAdmin']['publicSpaces'],
    intent: ReturnType<typeof this.analyzeCityAdminQuery>
  ): string {
    if (!spaces?.length) {
      return 'Leider konnte ich keine passenden öffentlichen Einrichtungen finden.'
    }

    // Filtere nach Standort wenn angegeben
    const filteredSpaces = intent.location
      ? spaces.filter(s => this.isLocationMatch(s.location, intent.location!))
      : spaces

    if (filteredSpaces.length === 0) {
      return `Für den Standort "${intent.location}" wurden keine Einrichtungen gefunden.`
    }

    return filteredSpaces.map(space =>
      `${space.name} (${space.type})\n` +
      `Standort: ${space.location}\n` +
      (space.amenities?.length ? `Ausstattung: ${space.amenities.join(', ')}\n` : '')
    ).join('\n\n')
  }

  private generateConstructionResponse(
    projects: PineconeCityAdministrationMetadata['cityAdmin']['construction'],
    intent: ReturnType<typeof this.analyzeCityAdminQuery>
  ): string {
    if (!projects?.length) {
      return 'Aktuell sind keine Bauarbeiten gemeldet.'
    }

    // Filtere nach Standort und/oder Datum
    let filteredProjects = projects
    if (intent.location) {
      filteredProjects = filteredProjects.filter(p => 
        this.isLocationMatch(p.location, intent.location!)
      )
    }
    if (intent.date) {
      filteredProjects = filteredProjects.filter(p =>
        this.isDateInRange(intent.date!, p.dates.start, p.dates.end)
      )
    }

    if (filteredProjects.length === 0) {
      return 'Für die angegebenen Kriterien wurden keine Bauarbeiten gefunden.'
    }

    return filteredProjects.map(project =>
      `${project.project} - ${project.status.toUpperCase()}\n` +
      `Standort: ${project.location}\n` +
      `Zeitraum: ${this.formatDate(project.dates.start)}` +
      (project.dates.end ? ` bis ${this.formatDate(project.dates.end)}` : '')
    ).join('\n\n')
  }

  private generateWasteResponse(
    waste: PineconeCityAdministrationMetadata['cityAdmin']['wasteManagement'],
    intent: ReturnType<typeof this.analyzeCityAdminQuery>
  ): string {
    if (!waste) {
      return 'Leider liegen keine Informationen zur Abfallwirtschaft vor.'
    }

    let response = ''

    // Abfuhrtermine
    if (waste.schedule && Object.keys(waste.schedule).length > 0) {
      response += 'Abfuhrtermine:\n'
      for (const [day, times] of Object.entries(waste.schedule)) {
        response += `${day}: ${times}\n`
      }
      response += '\n'
    }

    // Recyclingzentren
    if (waste.recyclingCenters?.length) {
      response += 'Recyclingzentren:\n'
      waste.recyclingCenters.forEach(center => {
        response += `${center.name} (${center.location})\n`
        response += `Angenommene Materialien: ${center.materials.join(', ')}\n`
        if (center.openingHours) {
          response += `Öffnungszeiten: ${center.openingHours}\n`
        }
        response += '\n'
      })
    }

    return response || 'Keine spezifischen Informationen verfügbar.'
  }

  private generateTransportResponse(
    transport: PineconeCityAdministrationMetadata['cityAdmin']['publicTransport'],
    intent: ReturnType<typeof this.analyzeCityAdminQuery>
  ): string {
    if (!transport) {
      return 'Leider liegen keine ÖPNV-Informationen vor.'
    }

    let response = ''

    // Aktuelle Störungen
    if (transport.updates?.length) {
      response += 'Aktuelle Störungen:\n'
      transport.updates.forEach(update => {
        response += `[${update.line}] ${update.type.toUpperCase()}: ${update.message}\n`
        if (update.validUntil) {
          response += `Gültig bis: ${this.formatDate(update.validUntil)}\n`
        }
        response += '\n'
      })
    }

    // Linien-Informationen
    if (transport.lines?.length) {
      response += 'Linien-Informationen:\n'
      transport.lines.forEach(line => {
        response += `${line.type.toUpperCase()} ${line.number}\n`
        response += `Route: ${line.route.join(' → ')}\n\n`
      })
    }

    return response || 'Keine spezifischen Informationen verfügbar.'
  }

  private generateGeneralCityAdminResponse(
    cityAdmin: PineconeCityAdministrationMetadata['cityAdmin']
  ): string {
    const sections: string[] = []

    // Aktuelle Ankündigungen
    if (cityAdmin.announcements?.length) {
      sections.push(
        'Aktuelle Bekanntmachungen:',
        ...cityAdmin.announcements
          .slice(0, 3)
          .map(a => `- ${a.title} (${this.formatDate(a.date)})`)
      )
    }

    // Aktuelle Bauarbeiten
    if (cityAdmin.construction?.length) {
      sections.push(
        'Aktuelle Bauarbeiten:',
        ...cityAdmin.construction
          .filter(c => c.status === 'in_progress')
          .slice(0, 3)
          .map(c => `- ${c.project} (${c.location})`)
      )
    }

    // ÖPNV-Störungen
    if (cityAdmin.publicTransport?.updates?.length) {
      sections.push(
        'Aktuelle ÖPNV-Störungen:',
        ...cityAdmin.publicTransport.updates
          .slice(0, 3)
          .map(u => `- ${u.line}: ${u.message}`)
      )
    }

    return sections.join('\n') || 'Keine aktuellen Informationen verfügbar.'
  }

  /**
   * Hilfsmethoden
   */
  private containsAny(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword))
  }

  private filterByKeywords<T extends { name: string; department?: string; location?: string }>(
    items: T[],
    keywords: string[]
  ): T[] {
    if (keywords.length === 0) return items
    return items.filter(item =>
      keywords.some(keyword =>
        item.name.toLowerCase().includes(keyword.toLowerCase())
      )
    )
  }

  private isDateRelevant(date: string, reference: string): boolean {
    try {
      const dateObj = new Date(date)
      const refObj = new Date(reference)
      return dateObj >= refObj
    } catch {
      return false
    }
  }

  private isLocationMatch(location: string, reference: string): boolean {
    return location.toLowerCase().includes(reference.toLowerCase())
  }

  private isDateInRange(date: string, start: string, end?: string): boolean {
    try {
      const dateObj = new Date(date)
      const startObj = new Date(start)
      const endObj = end ? new Date(end) : null

      return endObj
        ? dateObj >= startObj && dateObj <= endObj
        : dateObj >= startObj
    } catch {
      return false
    }
  }

  private formatDate(date: string): string {
    try {
      return new Date(date).toLocaleDateString('de-DE')
    } catch {
      return date
    }
  }

  /**
   * Generiert eine Standard-Antwort
   */
  private getDefaultResponse(context: HandlerContext): HandlerResponse {
    return {
      type: 'info',
      text: 'Entschuldigung, ich konnte keine spezifische Antwort generieren.',
      confidence: 0.5,
      metadata: {
        query: context.query,
        templateId: context.templateId,
        source: 'default'
      }
    }
  }

  /**
   * Berechnet die Konfidenz der Antwort
   */
  private calculateConfidence(response: HandlerResponse, context: HandlerContext): number {
    let confidence = response.confidence || 0.5

    // Erhöhe Konfidenz bei vorherigen erfolgreichen Antworten
    if (context.previousResponses?.length) {
      const avgPreviousConfidence = context.previousResponses.reduce(
        (sum, resp) => sum + resp.confidence,
        0
      ) / context.previousResponses.length

      confidence = (confidence + avgPreviousConfidence) / 2
    }

    // Reduziere Konfidenz bei sehr kurzen oder sehr langen Antworten
    const textLength = response.text.length
    if (textLength < 50 || textLength > 1000) {
      confidence *= 0.8
    }

    // Stelle sicher, dass die Konfidenz im gültigen Bereich liegt
    return Math.max(0, Math.min(1, confidence))
  }
} 