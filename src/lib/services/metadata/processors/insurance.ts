import { BaseMetadataProcessor } from './base'
import { EnhancedMetadata, InsuranceDomainMetadata } from '../types/enhanced'
import { PineconeInsuranceMetadata } from '../types/pinecone'
import { StructuralElement } from '../types/base'

/**
 * Versicherungs-Metadata-Processor
 */
export class InsuranceMetadataProcessor extends BaseMetadataProcessor {
  /**
   * Verarbeitet Versicherungs-Metadaten für Pinecone
   */
  async process(metadata: EnhancedMetadata): Promise<PineconeInsuranceMetadata> {
    // Basis-Transformation
    const baseMetadata = await this.transformToBase(metadata)
    
    // Domain-spezifische Daten extrahieren und validieren
    const domainData = this.validateDomainData(metadata.domain)

    return {
      ...baseMetadata,
      insurance: {
        // Leistungen
        coverage: domainData?.coverage?.included || 
                 this.extractCoverage(metadata),
        
        // Bedingungen
        conditions: domainData?.coverage?.conditions || 
                   this.extractConditions(metadata),
        
        // Kosten
        costs: domainData?.costs?.map(cost => ({
          amount: cost.amount.fixed || cost.amount.max || 0,
          currency: cost.amount.currency,
          type: cost.service
        })) || this.extractCosts(metadata),
        
        // Voraussetzungen
        requirements: domainData?.requirements || 
                     this.extractRequirements(metadata),
        
        // Prozesse
        processes: domainData?.processes?.map(p => p.name) || 
                  this.extractProcesses(metadata),
        
        // Vorteile
        benefits: this.extractBenefits(metadata)
      }
    }
  }

  /**
   * Validiert die Domain-Daten und konvertiert sie in den korrekten Typ
   */
  private validateDomainData(domain: Record<string, unknown> | undefined): InsuranceDomainMetadata | undefined {
    if (!domain) return undefined

    // Typ-Guard für InsuranceDomainMetadata
    const isInsuranceDomainMetadata = (data: unknown): data is InsuranceDomainMetadata => {
      const d = data as InsuranceDomainMetadata
      return d?.coverage !== undefined &&
             typeof d.coverage === 'object' &&
             Array.isArray(d.coverage.included) &&
             Array.isArray(d.coverage.conditions)
    }

    return isInsuranceDomainMetadata(domain) ? domain : undefined
  }

  /**
   * Extrahiert Leistungen aus der Struktur
   */
  private extractCoverage(metadata: EnhancedMetadata): string[] {
    const coverage = new Set<string>()

    metadata.structure.lists.forEach(list => {
      if (this.isCoverageList(list)) {
        const content = Array.isArray(list.content) ? list.content : [list.content]
        content.forEach(item => coverage.add(item))
      }
    })

    return Array.from(coverage)
  }

  /**
   * Extrahiert Bedingungen aus der Struktur
   */
  private extractConditions(metadata: EnhancedMetadata): string[] {
    const conditions = new Set<string>()

    metadata.structure.lists.forEach(list => {
      if (this.isConditionList(list)) {
        const content = Array.isArray(list.content) ? list.content : [list.content]
        content.forEach(item => conditions.add(item))
      }
    })

    return Array.from(conditions)
  }

  /**
   * Extrahiert Kosteninformationen aus der Struktur
   */
  private extractCosts(metadata: EnhancedMetadata): PineconeInsuranceMetadata['insurance']['costs'] {
    const costs: PineconeInsuranceMetadata['insurance']['costs'] = []

    metadata.structure.tables?.forEach(table => {
      if (this.isCostTable(table)) {
        const content = Array.isArray(table.content) ? table.content : [table.content]
        content.forEach(row => {
          const [service, amount, currency] = this.parseCostRow(row)
          if (service && amount && currency) {
            costs.push({
              amount: parseFloat(amount),
              currency,
              type: service
            })
          }
        })
      }
    })

    return costs
  }

  /**
   * Extrahiert Voraussetzungen aus der Struktur
   */
  private extractRequirements(metadata: EnhancedMetadata): string[] {
    const requirements = new Set<string>()

    metadata.structure.lists.forEach(list => {
      if (this.isRequirementList(list)) {
        const content = Array.isArray(list.content) ? list.content : [list.content]
        content.forEach(item => requirements.add(item))
      }
    })

    return Array.from(requirements)
  }

  /**
   * Extrahiert Prozesse aus der Struktur
   */
  private extractProcesses(metadata: EnhancedMetadata): string[] {
    const processes = new Set<string>()

    metadata.structure.sections
      .filter(section => this.isProcessSection(section))
      .forEach(section => {
        processes.add(section.title || '')
      })

    return Array.from(processes)
  }

  /**
   * Extrahiert Vorteile aus der Struktur
   */
  private extractBenefits(metadata: EnhancedMetadata): string[] {
    const benefits = new Set<string>()

    metadata.structure.lists.forEach(list => {
      if (this.isBenefitList(list)) {
        const content = Array.isArray(list.content) ? list.content : [list.content]
        content.forEach(item => benefits.add(item))
      }
    })

    return Array.from(benefits)
  }

  // Hilfsfunktionen zur Klassifizierung
  private isCoverageList(list: StructuralElement): boolean {
    const coverageKeywords = ['leistung', 'versicherungsschutz', 'abdeckung', 'inkludiert']
    return this.containsKeywords(list.context || '', coverageKeywords)
  }

  private isConditionList(list: StructuralElement): boolean {
    const conditionKeywords = ['bedingung', 'voraussetzung', 'konditionen']
    return this.containsKeywords(list.context || '', conditionKeywords)
  }

  private isCostTable(table: StructuralElement): boolean {
    const costKeywords = ['kosten', 'beitrag', 'preis', 'tarif']
    return this.containsKeywords(table.title || '', costKeywords)
  }

  private isRequirementList(list: StructuralElement): boolean {
    const requirementKeywords = ['voraussetzung', 'erforderlich', 'benötigt']
    return this.containsKeywords(list.context || '', requirementKeywords)
  }

  private isProcessSection(section: StructuralElement): boolean {
    const processKeywords = ['prozess', 'ablauf', 'verfahren', 'antrag']
    return this.containsKeywords(section.title || '', processKeywords)
  }

  private isBenefitList(list: StructuralElement): boolean {
    const benefitKeywords = ['vorteil', 'benefit', 'mehrwert', 'nutzen']
    return this.containsKeywords(list.context || '', benefitKeywords)
  }

  private parseCostRow(row: string): [string | null, string | null, string | null] {
    // Einfache Implementierung - kann je nach Tabellenformat angepasst werden
    const parts = row.split('|').map(part => part.trim())
    if (parts.length >= 3) {
      return [parts[0], parts[1], parts[2]]
    }
    return [null, null, null]
  }

  private containsKeywords(text: string, keywords: string[]): boolean {
    const lowerText = text.toLowerCase()
    return keywords.some(keyword => lowerText.includes(keyword))
  }
} 