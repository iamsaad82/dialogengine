import { StructuralElement } from './structural'
import { CitizenServices } from './enhanced'

/**
 * Basis-Metadaten für Pinecone-Einträge
 */
export interface PineconeBaseMetadata {
  id: string
  type: string
  title: string
  lastModified: string
  content: string | StructuralElement[]
  additionalContent?: string | StructuralElement[]
  language: string
  source: string
  tags: string[]
}

/**
 * Basis-Metadaten für verarbeitete Pinecone-Einträge
 */
export interface ProcessedMetadata {
  content: string | StructuralElement[]
  additionalContent?: string | StructuralElement[]
  language: string
  source: string
  tags: string[]
  lastModified: string
}

/**
 * Basis-Metadaten für erweiterte Pinecone-Einträge
 */
export interface EnhancedPineconeMetadata extends PineconeBaseMetadata {
  content: StructuralElement[]
  additionalContent?: StructuralElement[]
}

/**
 * Basis-Metadaten für alle Domänen
 */
export interface DomainMetadata extends PineconeBaseMetadata {
  type: DomainType
}

/**
 * Verfügbare Domänen-Typen
 */
export type DomainType = 'medical' | 'insurance' | 'commerce' | 'shoppingCenter' | 'cityAdministration'

/**
 * Union-Typ für alle möglichen Pinecone-Metadaten
 */
export type PineconeMetadata = 
  | PineconeMedicalMetadata
  | PineconeInsuranceMetadata
  | PineconeCommerceMetadata
  | PineconeShoppingCenterMetadata
  | PineconeCityAdministrationMetadata

/**
 * Medizinische Metadaten
 */
export interface PineconeMedicalMetadata extends DomainMetadata {
  type: 'medical'
  medical: {
    specialty?: string
    condition?: string
    treatment?: string
    symptoms?: string[]
    medications?: string[]
    procedures?: string[]
    recommendations?: string[]
  }
}

/**
 * Versicherungs-Metadaten
 */
export interface PineconeInsuranceMetadata extends DomainMetadata {
  type: 'insurance'
  insurance: {
    type?: string
    coverage?: string[]
    conditions?: string[]
    benefits?: string[]
    exclusions?: string[]
    premiums?: {
      amount: number
      period: string
    }
  }
}

/**
 * Handels-Metadaten
 */
export interface PineconeCommerceMetadata extends DomainMetadata {
  type: 'commerce'
  commerce: {
    category?: string
    products?: Array<{
      name: string
      description?: string
      price?: number
      availability?: boolean
      specifications?: Record<string, string>
    }>
    services?: Array<{
      name: string
      description?: string
      price?: number
      duration?: string
    }>
  }
}

/**
 * Einkaufszentrum-Metadaten
 */
export interface PineconeShoppingCenterMetadata extends DomainMetadata {
  type: 'shoppingCenter'
  shoppingCenter: {
    stores?: Array<{
      name: string
      category: string
      location: string
      openingHours?: string
      contact?: {
        phone?: string
        email?: string
      }
    }>
    facilities?: Array<{
      name: string
      type: string
      location: string
      description?: string
    }>
    events?: Array<{
      name: string
      date: string
      location: string
      description?: string
    }>
  }
}

export interface CityAdministrationService {
  name: string
  description: string
  department: string
  location: string
  requirements?: string
  costs?: string
}

export interface CityAdministrationDepartment {
  name: string
  description?: string
  responsibilities: string[]
  location: string
  contact: string
  openingHours: string
}

export interface CityAdministrationAnnouncement {
  type: string
  title: string
  date: string
  validUntil?: string
}

export interface CityAdministrationPublicSpace {
  name: string
  type: string
  location: string
  openingHours?: string
  facilities?: string[]
}

export interface CityAdministrationConstruction {
  type: string
  description: string
  location: string
  startDate: string
  endDate?: string
  impact?: string
}

export interface CityAdministrationWasteSchedule {
  type: string
  nextCollection: string
  frequency?: string
}

export interface CityAdministrationRecyclingCenter {
  name: string
  address: string
  openingHours: string
}

export interface CityAdministrationWasteManagement {
  district?: string
  generalInfo?: string
  collectionSchedule?: CityAdministrationWasteSchedule[]
  recyclingCenters?: CityAdministrationRecyclingCenter[]
}

export interface CityAdministrationTransportLine {
  name: string
  type: string
  route: string[]
}

export interface CityAdministrationDisruption {
  type: string
  description: string
  affectedLines: string[]
  validUntil?: string
}

export interface CityAdministrationPublicTransport {
  district?: string
  generalInfo?: string
  lines?: CityAdministrationTransportLine[]
  disruptions?: CityAdministrationDisruption[]
}

export interface CityAdministrationMetadata {
  services: CityAdministrationService[]
  departments: CityAdministrationDepartment[]
  announcements: CityAdministrationAnnouncement[]
  publicSpaces: CityAdministrationPublicSpace[]
  construction: CityAdministrationConstruction[]
  wasteManagement: CityAdministrationWasteManagement
  publicTransport: CityAdministrationPublicTransport
}

export interface PineconeCityAdministrationMetadata extends PineconeBaseMetadata {
  type: 'cityAdministration'
  cityAdmin: CityAdministrationMetadata
}

export interface MedicalData {
  diagnosis?: string;
  treatment?: string;
  medications?: string[];
  contraindications?: string[];
  lastUpdated?: string;
}

/**
 * Type Guards für die verschiedenen Metadaten-Typen
 */
export function isMedicalMetadata(
  metadata: PineconeMetadata
): metadata is PineconeMetadata & { medical: MedicalData } {
  return metadata.type === 'medical' && !!metadata.medical;
}

export function isInsuranceMetadata(
  metadata: PineconeMetadata
): metadata is PineconeInsuranceMetadata {
  return metadata.type === 'insurance' && 'insurance' in metadata
}

export function isCommerceMetadata(
  metadata: PineconeMetadata
): metadata is PineconeCommerceMetadata {
  return metadata.type === 'commerce' && 'commerce' in metadata
}

export function isShoppingCenterMetadata(
  metadata: PineconeMetadata
): metadata is PineconeShoppingCenterMetadata {
  return metadata.type === 'shoppingCenter' && 'shoppingCenter' in metadata
}

export function isCityAdministrationMetadata(
  metadata: PineconeMetadata
): metadata is PineconeCityAdministrationMetadata {
  return metadata.type === 'cityAdministration' && 'cityAdmin' in metadata
}

/**
 * Basis-Metadaten für alle Domänen
 */
export interface BaseDomainMetadata {
  id: string
  type: DomainType
  title: string
  content: StructuralElement[]
  additionalContent?: StructuralElement[]
  language: string
  source: string
  tags: string[]
  lastModified: string
} 