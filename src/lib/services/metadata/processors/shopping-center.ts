import { BaseMetadataProcessor } from './base'
import { EnhancedMetadata, ShoppingCenterDomainMetadata } from '../types/enhanced'
import { PineconeShoppingCenterMetadata } from '../types/pinecone'
import { StructuralElement } from '../types/base'

/**
 * Shopping-Center-Metadata-Processor
 */
export class ShoppingCenterProcessor extends BaseMetadataProcessor {
  /**
   * Verarbeitet Shopping-Center-Metadaten für Pinecone
   */
  async process(metadata: EnhancedMetadata): Promise<PineconeShoppingCenterMetadata> {
    // Basis-Transformation
    const baseMetadata = await this.transformToBase(metadata)
    
    // Domain-spezifische Daten extrahieren und validieren
    const domainData = this.validateDomainData(metadata.domain)

    return {
      ...baseMetadata,
      shoppingCenter: {
        // News
        news: domainData?.news?.map(news => ({
          title: news.title,
          date: news.date,
          type: news.type
        })) || this.extractNews(metadata),
        
        // Angebote
        offers: domainData?.offers?.map(offer => ({
          shop: offer.shop,
          title: offer.title,
          validFrom: offer.validFrom,
          validUntil: offer.validUntil
        })) || this.extractOffers(metadata),
        
        // Services
        services: domainData?.services?.map(service => ({
          name: service.name,
          location: service.location,
          type: this.categorizeService(service.name)
        })) || this.extractServices(metadata),
        
        // Shops
        shops: domainData?.shops?.map(shop => ({
          name: shop.name,
          category: shop.category,
          location: shop.location,
          floor: shop.floor
        })) || this.extractShops(metadata),
        
        // Einrichtungen
        facilities: this.extractFacilities(metadata),
        
        // Events
        events: domainData?.events?.map(event => ({
          title: event.title,
          date: event.date,
          type: event.type
        })) || this.extractEvents(metadata),
        
        // Öffnungszeiten
        openingHours: this.extractOpeningHours(metadata),
        
        // Barrierefreiheit
        accessibility: this.extractAccessibility(metadata)
      }
    }
  }

  /**
   * Validiert die Domain-Daten und konvertiert sie in den korrekten Typ
   */
  private validateDomainData(domain: Record<string, unknown> | undefined): ShoppingCenterDomainMetadata | undefined {
    if (!domain) return undefined

    // Typ-Guard für ShoppingCenterDomainMetadata
    const isShoppingCenterDomainMetadata = (data: unknown): data is ShoppingCenterDomainMetadata => {
      const d = data as ShoppingCenterDomainMetadata
      return d?.shops !== undefined || d?.services !== undefined
    }

    return isShoppingCenterDomainMetadata(domain) ? domain : undefined
  }

  /**
   * Extrahiert News aus der Struktur
   */
  private extractNews(metadata: EnhancedMetadata): PineconeShoppingCenterMetadata['shoppingCenter']['news'] {
    const news: PineconeShoppingCenterMetadata['shoppingCenter']['news'] = []

    metadata.structure.sections
      .filter(section => this.isNewsSection(section))
      .forEach(section => {
        const date = this.extractDate(section.content)
        if (date) {
          news.push({
            title: section.title || '',
            date,
            type: this.categorizeNewsType(section.title || '', section.content)
          })
        }
      })

    return news
  }

  /**
   * Extrahiert Angebote aus der Struktur
   */
  private extractOffers(metadata: EnhancedMetadata): PineconeShoppingCenterMetadata['shoppingCenter']['offers'] {
    const offers: PineconeShoppingCenterMetadata['shoppingCenter']['offers'] = []

    metadata.structure.lists.forEach(list => {
      if (this.isOfferList(list)) {
        const content = Array.isArray(list.content) ? list.content : [list.content]
        content.forEach(item => {
          const [shop, title, dates] = this.parseOfferItem(item)
          if (shop && title && dates?.validFrom) {
            offers.push({
              shop,
              title,
              validFrom: dates.validFrom,
              validUntil: dates.validUntil
            })
          }
        })
      }
    })

    return offers
  }

  /**
   * Extrahiert Services aus der Struktur
   */
  private extractServices(metadata: EnhancedMetadata): PineconeShoppingCenterMetadata['shoppingCenter']['services'] {
    const services: PineconeShoppingCenterMetadata['shoppingCenter']['services'] = []

    metadata.structure.sections
      .filter(section => this.isServiceSection(section))
      .forEach(section => {
        const location = this.extractLocation(section.content)
        if (location) {
          services.push({
            name: section.title || '',
            location,
            type: this.categorizeService(section.title || '')
          })
        }
      })

    return services
  }

  /**
   * Extrahiert Shops aus der Struktur
   */
  private extractShops(metadata: EnhancedMetadata): PineconeShoppingCenterMetadata['shoppingCenter']['shops'] {
    const shops: PineconeShoppingCenterMetadata['shoppingCenter']['shops'] = []

    metadata.structure.tables?.forEach(table => {
      if (this.isShopTable(table)) {
        const content = Array.isArray(table.content) ? table.content : [table.content]
        content.forEach(row => {
          const [name, category, location, floor] = this.parseShopRow(row)
          if (name && category && location && floor) {
            shops.push({
              name,
              category,
              location,
              floor
            })
          }
        })
      }
    })

    return shops
  }

  /**
   * Extrahiert Einrichtungen aus der Struktur
   */
  private extractFacilities(metadata: EnhancedMetadata): string[] {
    const facilities = new Set<string>()

    metadata.structure.lists.forEach(list => {
      if (this.isFacilityList(list)) {
        const content = Array.isArray(list.content) ? list.content : [list.content]
        content.forEach(item => facilities.add(item))
      }
    })

    return Array.from(facilities)
  }

  /**
   * Extrahiert Events aus der Struktur
   */
  private extractEvents(metadata: EnhancedMetadata): PineconeShoppingCenterMetadata['shoppingCenter']['events'] {
    const events: PineconeShoppingCenterMetadata['shoppingCenter']['events'] = []

    metadata.structure.sections
      .filter(section => this.isEventSection(section))
      .forEach(section => {
        const date = this.extractDate(section.content)
        if (date) {
          events.push({
            title: section.title || '',
            date,
            type: this.categorizeEventType(section.title || '', section.content)
          })
        }
      })

    return events
  }

  /**
   * Extrahiert Öffnungszeiten aus der Struktur
   */
  private extractOpeningHours(metadata: EnhancedMetadata): string[] {
    const hours = new Set<string>()

    metadata.structure.tables?.forEach(table => {
      if (this.isOpeningHoursTable(table)) {
        const content = Array.isArray(table.content) ? table.content : [table.content]
        content.forEach(row => hours.add(row))
      }
    })

    return Array.from(hours)
  }

  /**
   * Extrahiert Barrierefreiheit-Informationen aus der Struktur
   */
  private extractAccessibility(metadata: EnhancedMetadata): string[] {
    const accessibility = new Set<string>()

    metadata.structure.lists.forEach(list => {
      if (this.isAccessibilityList(list)) {
        const content = Array.isArray(list.content) ? list.content : [list.content]
        content.forEach(item => accessibility.add(item))
      }
    })

    return Array.from(accessibility)
  }

  // Hilfsfunktionen zur Klassifizierung
  private isNewsSection(section: StructuralElement): boolean {
    const newsKeywords = ['news', 'aktuelles', 'neuigkeiten', 'ankündigung']
    return this.containsKeywords(section.title || '', newsKeywords)
  }

  private isOfferList(list: StructuralElement): boolean {
    const offerKeywords = ['angebot', 'rabatt', 'aktion', 'sale']
    return this.containsKeywords(list.context || '', offerKeywords)
  }

  private isServiceSection(section: StructuralElement): boolean {
    const serviceKeywords = ['service', 'dienstleistung', 'kundenservice']
    return this.containsKeywords(section.title || '', serviceKeywords)
  }

  private isShopTable(table: StructuralElement): boolean {
    const shopKeywords = ['shop', 'geschäft', 'laden', 'store']
    return this.containsKeywords(table.title || '', shopKeywords)
  }

  private isFacilityList(list: StructuralElement): boolean {
    const facilityKeywords = ['einrichtung', 'ausstattung', 'service']
    return this.containsKeywords(list.context || '', facilityKeywords)
  }

  private isEventSection(section: StructuralElement): boolean {
    const eventKeywords = ['event', 'veranstaltung', 'aktion']
    return this.containsKeywords(section.title || '', eventKeywords)
  }

  private isOpeningHoursTable(table: StructuralElement): boolean {
    const hoursKeywords = ['öffnungszeit', 'geschäftszeit', 'zeiten']
    return this.containsKeywords(table.title || '', hoursKeywords)
  }

  private isAccessibilityList(list: StructuralElement): boolean {
    const accessibilityKeywords = ['barrierefrei', 'zugänglich', 'rollstuhl']
    return this.containsKeywords(list.context || '', accessibilityKeywords)
  }

  // Parser-Funktionen
  private parseOfferItem(item: string): [string | null, string | null, { validFrom: string; validUntil?: string } | null] {
    const parts = item.split('-').map(part => part.trim())
    if (parts.length >= 2) {
      const dates = this.extractDateRange(parts[parts.length - 1])
      return [parts[0], parts[1], dates]
    }
    return [null, null, null]
  }

  private parseShopRow(row: string): [string | null, string | null, string | null, string | null] {
    const parts = row.split('|').map(part => part.trim())
    if (parts.length >= 4) {
      return [parts[0], parts[1], parts[2], parts[3]]
    }
    return [null, null, null, null]
  }

  // Kategorisierungs-Funktionen
  private categorizeNewsType(title: string, content: string | string[]): string {
    const contentStr = Array.isArray(content) ? content.join(' ') : content
    const lowerContent = contentStr.toLowerCase()

    if (lowerContent.includes('event') || lowerContent.includes('veranstaltung')) return 'event'
    if (lowerContent.includes('aktion') || lowerContent.includes('rabatt')) return 'promotion'
    if (lowerContent.includes('eröffnung') || lowerContent.includes('neu')) return 'opening'
    return 'other'
  }

  private categorizeService(name: string): string {
    const lowerName = name.toLowerCase()
    
    if (lowerName.includes('info')) return 'information'
    if (lowerName.includes('park')) return 'parking'
    if (lowerName.includes('kunden')) return 'customer_service'
    return 'other'
  }

  private categorizeEventType(title: string, content: string | string[]): string {
    const contentStr = Array.isArray(content) ? content.join(' ') : content
    const lowerContent = contentStr.toLowerCase()

    if (lowerContent.includes('sale') || lowerContent.includes('rabatt')) return 'sale'
    if (lowerContent.includes('kinder')) return 'kids'
    if (lowerContent.includes('saison') || lowerContent.includes('weihnacht')) return 'seasonal'
    if (lowerContent.includes('show') || lowerContent.includes('musik')) return 'entertainment'
    return 'other'
  }

  // Extraktions-Hilfsfunktionen
  private extractDate(content: string | string[]): string | null {
    // Einfache Implementierung - kann erweitert werden
    const dateRegex = /\d{2}[./-]\d{2}[./-]\d{4}/
    const contentStr = Array.isArray(content) ? content.join(' ') : content
    const match = contentStr.match(dateRegex)
    return match ? match[0] : null
  }

  private extractDateRange(text: string): { validFrom: string; validUntil?: string } | null {
    const matches = text.match(/\d{2}[./-]\d{2}[./-]\d{4}/g)
    if (!matches) return null
    
    return {
      validFrom: matches[0],
      validUntil: matches.length > 1 ? matches[1] : undefined
    }
  }

  private extractLocation(content: string | string[]): string | null {
    const contentStr = Array.isArray(content) ? content.join(' ') : content
    const locationRegex = /(?:EG|UG|[0-9]\. OG|[0-9]\. Stock)/i
    const match = contentStr.match(locationRegex)
    return match ? match[0] : null
  }

  private containsKeywords(text: string, keywords: string[]): boolean {
    const lowerText = text.toLowerCase()
    return keywords.some(keyword => lowerText.includes(keyword))
  }
} 