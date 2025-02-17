import { BaseMetadataProcessor } from './base'
import { EnhancedMetadata, CommerceDomainMetadata } from '../types/enhanced'
import { PineconeCommerceMetadata } from '../types/pinecone'
import { StructuralElement } from '../types/base'

/**
 * Commerce-Metadata-Processor
 */
export class CommerceMetadataProcessor extends BaseMetadataProcessor {
  /**
   * Verarbeitet Commerce-Metadaten für Pinecone
   */
  async process(metadata: EnhancedMetadata): Promise<PineconeCommerceMetadata> {
    // Basis-Transformation
    const baseMetadata = await this.transformToBase(metadata)
    
    // Domain-spezifische Daten extrahieren und validieren
    const domainData = this.validateDomainData(metadata.domain)

    return {
      ...baseMetadata,
      commerce: {
        // Produkte
        products: domainData?.products?.map(product => ({
          name: product.name,
          sku: product.sku,
          price: product.price.amount,
          currency: product.price.currency,
          availability: product.availability
        })) || this.extractProducts(metadata),
        
        // Kategorien
        categories: this.extractCategories(metadata),
        
        // Marken
        brands: this.extractBrands(metadata),
        
        // Features/Merkmale
        features: this.extractFeatures(metadata),
        
        // Technische Spezifikationen
        specifications: this.extractSpecifications(metadata)
      }
    }
  }

  /**
   * Validiert die Domain-Daten und konvertiert sie in den korrekten Typ
   */
  private validateDomainData(domain: Record<string, unknown> | undefined): CommerceDomainMetadata | undefined {
    if (!domain) return undefined

    // Typ-Guard für CommerceDomainMetadata
    const isCommerceDomainMetadata = (data: unknown): data is CommerceDomainMetadata => {
      const d = data as CommerceDomainMetadata
      return (d?.products !== undefined && Array.isArray(d.products)) ||
             (d?.services !== undefined && Array.isArray(d.services))
    }

    return isCommerceDomainMetadata(domain) ? domain : undefined
  }

  /**
   * Extrahiert Produkte aus der Struktur
   */
  private extractProducts(metadata: EnhancedMetadata): PineconeCommerceMetadata['commerce']['products'] {
    const products: PineconeCommerceMetadata['commerce']['products'] = []

    metadata.structure.tables?.forEach(table => {
      if (this.isProductTable(table)) {
        const content = Array.isArray(table.content) ? table.content : [table.content]
        content.forEach(row => {
          const [name, sku, price, currency, availability] = this.parseProductRow(row)
          if (name && price && currency) {
            products.push({
              name,
              sku: sku || undefined,
              price: parseFloat(price),
              currency,
              availability: this.normalizeAvailability(availability)
            })
          }
        })
      }
    })

    return products
  }

  /**
   * Extrahiert Kategorien aus der Struktur
   */
  private extractCategories(metadata: EnhancedMetadata): string[] {
    const categories = new Set<string>()

    // Aus Sections extrahieren
    metadata.structure.sections
      .filter(section => this.isCategorySection(section))
      .forEach(section => {
        categories.add(section.title || '')
      })

    // Aus Listen extrahieren
    metadata.structure.lists.forEach(list => {
      if (this.isCategoryList(list)) {
        const content = Array.isArray(list.content) ? list.content : [list.content]
        content.forEach(item => categories.add(item))
      }
    })

    return Array.from(categories)
  }

  /**
   * Extrahiert Marken aus der Struktur
   */
  private extractBrands(metadata: EnhancedMetadata): string[] {
    const brands = new Set<string>()

    metadata.structure.lists.forEach(list => {
      if (this.isBrandList(list)) {
        const content = Array.isArray(list.content) ? list.content : [list.content]
        content.forEach(item => brands.add(item))
      }
    })

    // Auch aus Links extrahieren
    metadata.relations.externalLinks
      .filter(link => this.isBrandLink(link))
      .forEach(link => brands.add(link.text))

    return Array.from(brands)
  }

  /**
   * Extrahiert Features/Merkmale aus der Struktur
   */
  private extractFeatures(metadata: EnhancedMetadata): string[] {
    const features = new Set<string>()

    metadata.structure.lists.forEach(list => {
      if (this.isFeatureList(list)) {
        const content = Array.isArray(list.content) ? list.content : [list.content]
        content.forEach(item => features.add(item))
      }
    })

    return Array.from(features)
  }

  /**
   * Extrahiert technische Spezifikationen aus der Struktur
   */
  private extractSpecifications(metadata: EnhancedMetadata): Record<string, string> {
    const specs: Record<string, string> = {}

    metadata.structure.tables?.forEach(table => {
      if (this.isSpecificationTable(table)) {
        const content = Array.isArray(table.content) ? table.content : [table.content]
        content.forEach(row => {
          const [key, value] = this.parseSpecificationRow(row)
          if (key && value) {
            specs[key] = value
          }
        })
      }
    })

    return specs
  }

  // Hilfsfunktionen zur Klassifizierung
  private isProductTable(table: StructuralElement): boolean {
    const productKeywords = ['produkt', 'artikel', 'ware', 'angebot']
    return this.containsKeywords(table.title || '', productKeywords)
  }

  private isCategorySection(section: StructuralElement): boolean {
    const categoryKeywords = ['kategorie', 'bereich', 'abteilung', 'sortiment']
    return this.containsKeywords(section.title || '', categoryKeywords)
  }

  private isCategoryList(list: StructuralElement): boolean {
    const categoryKeywords = ['kategorie', 'bereich', 'abteilung', 'sortiment']
    return this.containsKeywords(list.context || '', categoryKeywords)
  }

  private isBrandList(list: StructuralElement): boolean {
    const brandKeywords = ['marke', 'hersteller', 'brand']
    return this.containsKeywords(list.context || '', brandKeywords)
  }

  private isBrandLink(link: { text: string; context?: string }): boolean {
    const brandKeywords = ['marke', 'hersteller', 'brand']
    return this.containsKeywords(link.context || '', brandKeywords)
  }

  private isFeatureList(list: StructuralElement): boolean {
    const featureKeywords = ['feature', 'merkmal', 'eigenschaft', 'highlight']
    return this.containsKeywords(list.context || '', featureKeywords)
  }

  private isSpecificationTable(table: StructuralElement): boolean {
    const specKeywords = ['spezifikation', 'technische daten', 'details', 'eigenschaften']
    return this.containsKeywords(table.title || '', specKeywords)
  }

  private parseProductRow(row: string): [string | null, string | null, string | null, string | null, string | null] {
    const parts = row.split('|').map(part => part.trim())
    if (parts.length >= 5) {
      return [parts[0], parts[1], parts[2], parts[3], parts[4]]
    }
    return [null, null, null, null, null]
  }

  private parseSpecificationRow(row: string): [string | null, string | null] {
    const parts = row.split('|').map(part => part.trim())
    if (parts.length >= 2) {
      return [parts[0], parts[1]]
    }
    return [null, null]
  }

  private normalizeAvailability(availability: string | null): string {
    if (!availability) return 'out_of_stock'
    
    const lowerAvailability = availability.toLowerCase()
    if (lowerAvailability.includes('lager') || lowerAvailability.includes('verfügbar')) {
      return 'in_stock'
    }
    if (lowerAvailability.includes('vorbestell')) {
      return 'pre_order'
    }
    return 'out_of_stock'
  }

  private containsKeywords(text: string, keywords: string[]): boolean {
    const lowerText = text.toLowerCase()
    return keywords.some(keyword => lowerText.includes(keyword))
  }
} 