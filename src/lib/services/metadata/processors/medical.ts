import { BaseMetadataProcessor } from './base'
import { EnhancedMetadata, MedicalDomainMetadata } from '../types/enhanced'
import { PineconeMedicalMetadata } from '../types/pinecone'
import { StructuralElement } from '../types/base'

type Link = { text: string; context?: string } & ({ path: string } | { url: string })

/**
 * Medizinischer Metadata-Processor
 */
export class MedicalMetadataProcessor extends BaseMetadataProcessor {
  /**
   * Verarbeitet medizinische Metadaten für Pinecone
   */
  async process(metadata: EnhancedMetadata): Promise<PineconeMedicalMetadata> {
    // Basis-Transformation
    const baseMetadata = await this.transformToBase(metadata)
    
    // Domain-spezifische Daten extrahieren
    const domainData = metadata.domain as MedicalDomainMetadata

    return {
      ...baseMetadata,
      medical: {
        // Behandlungen
        treatments: domainData?.treatments?.map(t => t.name) || 
                   this.extractTreatments(metadata),
        
        // Symptome
        symptoms: domainData?.symptoms || 
                 this.extractSymptoms(metadata),
        
        // Fachärzte
        specialists: domainData?.specialists || 
                    this.extractSpecialists(metadata),
        
        // Medikamente
        medications: domainData?.medications?.map(m => m.name) || 
                    this.extractMedications(metadata),
        
        // Anforderungen
        requirements: this.extractRequirements(metadata),
        
        // Dauer/Zeitangaben
        duration: this.extractDuration(metadata),
        
        // Standorte/Einrichtungen
        locations: this.extractLocations(metadata)
      }
    }
  }

  /**
   * Extrahiert Behandlungen aus der Struktur
   */
  private extractTreatments(metadata: EnhancedMetadata): string[] {
    const treatments = new Set<string>()

    // Aus Listen extrahieren
    metadata.structure.lists.forEach(list => {
      if (this.isTreatmentList(list)) {
        const content = Array.isArray(list.content) ? list.content : [list.content]
        content.forEach(item => treatments.add(item))
      }
    })

    // Aus Überschriften
    metadata.structure.sections
      .filter(section => this.isTreatmentSection(section))
      .forEach(section => {
        const content = Array.isArray(section.content) ? section.content : [section.content]
        content.forEach(item => treatments.add(item))
      })

    return Array.from(treatments)
  }

  /**
   * Extrahiert Symptome aus der Struktur
   */
  private extractSymptoms(metadata: EnhancedMetadata): string[] {
    const symptoms = new Set<string>()

    metadata.structure.lists.forEach(list => {
      if (this.isSymptomList(list)) {
        const content = Array.isArray(list.content) ? list.content : [list.content]
        content.forEach(item => symptoms.add(item))
      }
    })

    return Array.from(symptoms)
  }

  /**
   * Extrahiert Fachärzte aus der Struktur
   */
  private extractSpecialists(metadata: EnhancedMetadata): string[] {
    const specialists = new Set<string>()

    // Getrennte Verarbeitung für interne und externe Links
    metadata.relations.internalLinks
      .filter(link => this.isSpecialistLink(link))
      .forEach(link => specialists.add(link.text))

    metadata.relations.externalLinks
      .filter(link => this.isSpecialistLink(link))
      .forEach(link => specialists.add(link.text))

    return Array.from(specialists)
  }

  /**
   * Extrahiert Medikamente aus der Struktur
   */
  private extractMedications(metadata: EnhancedMetadata): string[] {
    const medications = new Set<string>()

    metadata.structure.lists.forEach(list => {
      if (this.isMedicationList(list)) {
        const content = Array.isArray(list.content) ? list.content : [list.content]
        content.forEach(item => medications.add(item))
      }
    })

    return Array.from(medications)
  }

  /**
   * Extrahiert Anforderungen aus der Struktur
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
   * Extrahiert Zeitangaben aus der Struktur
   */
  private extractDuration(metadata: EnhancedMetadata): string | undefined {
    // Suche in Sections nach Zeitangaben
    for (const section of metadata.structure.sections) {
      if (this.isDurationSection(section)) {
        return Array.isArray(section.content) 
          ? section.content[0] 
          : section.content
      }
    }
    return undefined
  }

  /**
   * Extrahiert Standorte aus der Struktur
   */
  private extractLocations(metadata: EnhancedMetadata): string[] {
    const locations = new Set<string>()

    // Getrennte Verarbeitung für interne und externe Links
    metadata.relations.internalLinks
      .filter(link => this.isLocationLink(link))
      .forEach(link => locations.add(link.text))

    metadata.relations.externalLinks
      .filter(link => this.isLocationLink(link))
      .forEach(link => locations.add(link.text))

    return Array.from(locations)
  }

  // Hilfsfunktionen zur Klassifizierung
  private isTreatmentList(list: StructuralElement): boolean {
    const treatmentKeywords = ['behandlung', 'therapie', 'eingriff', 'operation']
    return this.containsKeywords(list.context || '', treatmentKeywords)
  }

  private isTreatmentSection(section: StructuralElement): boolean {
    const treatmentKeywords = ['behandlung', 'therapie', 'eingriff', 'operation']
    return this.containsKeywords(section.title || '', treatmentKeywords)
  }

  private isSymptomList(list: StructuralElement): boolean {
    const symptomKeywords = ['symptom', 'anzeichen', 'beschwerden']
    return this.containsKeywords(list.context || '', symptomKeywords)
  }

  private isSpecialistLink(link: { text: string; context?: string }): boolean {
    const specialistKeywords = ['arzt', 'ärztin', 'praxis', 'facharzt', 'fachärztin']
    return this.containsKeywords(link.text, specialistKeywords)
  }

  private isMedicationList(list: StructuralElement): boolean {
    const medicationKeywords = ['medikament', 'medikation', 'arzneimittel']
    return this.containsKeywords(list.context || '', medicationKeywords)
  }

  private isRequirementList(list: StructuralElement): boolean {
    const requirementKeywords = ['voraussetzung', 'erforderlich', 'benötigt']
    return this.containsKeywords(list.context || '', requirementKeywords)
  }

  private isDurationSection(section: StructuralElement): boolean {
    const durationKeywords = ['dauer', 'zeitraum', 'länge']
    return this.containsKeywords(section.title || '', durationKeywords)
  }

  private isLocationLink(link: { text: string; context?: string }): boolean {
    const locationKeywords = ['klinik', 'krankenhaus', 'praxis', 'zentrum']
    return this.containsKeywords(link.text, locationKeywords)
  }

  private containsKeywords(text: string, keywords: string[]): boolean {
    const lowerText = text.toLowerCase()
    return keywords.some(keyword => lowerText.includes(keyword))
  }
} 