import { 
  MedicalData,
  InsuranceData,
  BaseMetadata
} from '../../../types'
import { ContentType } from '../../../types/content'
import { MediaElement, InteractiveElement } from './base'

/**
 * Basis Pinecone Metadaten
 */
export interface PineconeBaseMetadata {
  // Identifikation
  templateId: string
  contentId: string
  type: ContentType
  
  // Strukturelle Information
  section?: string
  hierarchy?: string[]
  
  // Zeitliche Metadaten
  validFrom?: string
  validUntil?: string
  lastUpdated: string
  
  // Interaktive Elemente
  actions?: Array<{
    type: 'button' | 'form' | 'link'
    text: string
    url?: string
    context?: string
  }>
  
  // Medien-Verweise
  media?: Array<{
    type: 'image' | 'video' | 'document'
    url: string
    title?: string
    context?: string
  }>

  // Link-Informationen
  links_internal?: Array<{
    url: string
    title: string
  }>
  links_external?: Array<{
    url: string
    domain: string
    trust: number
  }>
  links_media?: Array<{
    url: string
    type: 'image' | 'video' | 'pdf'
    description: string
  }>

  // Zusätzlicher Inhalt für die Vektorsuche
  searchableContent?: string

  language: string
  lastModified?: string
}

// Service-spezifische Typen
export interface CityAdministrationService {
  name: string;
  description?: string;
  category?: string;
  availability?: string;
  requirements?: string[];
  contact?: string;
}

export interface CityAdministrationData {
  service: string;
  services: CityAdministrationService[];
  lastUpdated?: string;
  department?: string;
  location?: string;
  openingHours?: string;
  contactInfo?: string;
  requirements?: string[];
  fees?: string;
  processingTime?: string;
  additionalInfo?: string;
}

/**
 * Medizinische Pinecone Metadaten
 */
export interface PineconeMedicalMetadata extends PineconeBaseMetadata {
  type: 'medical'
  medical: MedicalData
}

/**
 * Versicherungs-Pinecone Metadaten
 */
export interface PineconeInsuranceMetadata extends PineconeBaseMetadata {
  type: 'insurance'
  insurance: InsuranceData
}

/**
 * Stadtverwaltungs-Pinecone Metadaten
 */
export interface PineconeCityAdministrationMetadata extends PineconeBaseMetadata {
  type: 'city-administration'
  cityAdmin: CityAdministrationData
}

/**
 * Shopping-Center Pinecone Metadaten
 */
export interface PineconeShoppingCenterMetadata extends PineconeBaseMetadata {
  type: 'shopping-center'
  shoppingCenter: {
    news?: Array<{
      title: string
      date: string
      type: string
    }>
    offers?: Array<{
      shop: string
      title: string
      validFrom: string
      validUntil?: string
    }>
    services?: Array<{
      name: string
      location: string
      type: string
    }>
    shops?: Array<{
      name: string
      category: string
      location: string
      floor: string
    }>
    facilities?: string[]
    events?: Array<{
      title: string
      date: string
      type: string
    }>
    openingHours?: string[]
    accessibility?: string[]
  }
}

/**
 * Union Type für alle Pinecone Metadaten
 */
export type PineconeMetadata = 
  | PineconeCityAdministrationMetadata 
  | PineconeMedicalMetadata 
  | PineconeInsuranceMetadata
  | PineconeShoppingCenterMetadata;

/**
 * Type Guard Funktionen
 */
export function isCityAdministrationMetadata(
  metadata: PineconeMetadata
): metadata is PineconeCityAdministrationMetadata {
  return metadata.type === 'city-administration' && 'cityAdmin' in metadata;
}

export function isMedicalMetadata(
  metadata: PineconeMetadata
): metadata is PineconeMedicalMetadata {
  return metadata.type === 'medical' && 'medical' in metadata;
}

export function isInsuranceMetadata(
  metadata: PineconeMetadata
): metadata is PineconeInsuranceMetadata {
  return metadata.type === 'insurance' && 'insurance' in metadata;
}

export function isShoppingCenterMetadata(
  metadata: PineconeMetadata
): metadata is PineconeShoppingCenterMetadata {
  return metadata.type === 'shopping-center' && 'shoppingCenter' in metadata;
} 
