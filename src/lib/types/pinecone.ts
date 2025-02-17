import { ContentType } from './contentTypes'
import { Pinecone } from '@pinecone-database/pinecone'

export type RecordMetadataValue = string | number | boolean | null | string[] | Record<string, unknown>

export interface InteractiveElement {
  type: string
  text: string
  action: string
}

export interface RelatedTopics {
  interactiveElements?: InteractiveElement[]
}

export interface DocumentMetadata {
  id: string
  type: ContentType
  title: string | null
  language: string
  source: string
  lastModified: string
  templateId: string
  templateMetadata: Record<string, unknown>
  relatedTopics?: RelatedTopics
  links?: {
    internal: Array<{
      url: string
      title: string
      context: string
    }>
    external: Array<{
      url: string
      domain: string
      trust: number
    }>
    media: Array<{
      url: string
      type: 'image' | 'video' | 'pdf'
      description: string
    }>
  }
  [key: string]: RecordMetadataValue | Record<string, unknown> | RelatedTopics | undefined
}

/**
 * Basis-Metadaten Interface
 */
export interface BaseMetadata {
  id: string
  type: ContentType
  title: string
  language: string
  source: string
  tags: string[]
  lastModified: string
  templateId: string
  contentId: string
  interactiveElements?: Array<{
    type: 'link' | 'button' | 'form'
    text: string
    action: string
  }>
}

/**
 * Stadtverwaltungs-Service
 */
export interface CityService {
  name: string
  department: string
  description?: string
  location: string
  contact?: {
    phone?: string
    email?: string
    hours?: string
  }
}

/**
 * Abteilung
 */
export interface Department {
  name: string
  responsibilities: string[]
  location: string
  head?: string
  contact?: {
    phone?: string
    email?: string
    hours?: string
  }
}

/**
 * Ankündigung
 */
export interface Announcement {
  title: string
  date: string
  type: string
  content: string
  validUntil?: string
}

/**
 * Öffentlicher Raum
 */
export interface PublicSpace {
  name: string
  type: string
  location: string
  facilities?: string[]
  openingHours?: string
}

/**
 * Bauprojekt
 */
export interface Construction {
  project: string
  location: string
  status: string
  dates: {
    start: string
    end?: string
  }
  impact?: string[]
}

/**
 * Abfallwirtschaft
 */
export interface WasteManagement {
  schedule?: Record<string, string>
  recyclingCenters?: Array<{
    name: string
    location: string
    materials: string[]
    openingHours?: string
  }>
}

/**
 * ÖPNV
 */
export interface PublicTransport {
  lines?: Array<{
    number: string
    type: string
    route: string[]
  }>
  updates?: Array<{
    line: string
    type: string
    message: string
  }>
}

/**
 * Stadtverwaltungs-Metadaten
 */
export interface CityAdministrationMetadata {
  department: string
  service: string
  location: string
  contactInfo: {
    email: string
    phone?: string
    address: string
  }
}

/**
 * Pinecone Stadtverwaltungs-Metadaten
 */
export interface PineconeCityAdministrationMetadata {
  type: 'cityAdministration'
  title: string
  description: string
  lastUpdated: string
  version: string
  language: string
  status: 'active' | 'inactive' | 'archived'
  templateId: string
  contentId: string
  source: string
  tags: string[]
  cityAdmin: string // JSON-String der CityAdministrationMetadata
  interactiveElements: string | null // JSON-String der interaktiven Elemente
  [key: string]: RecordMetadataValue | null
}

export interface MedicalMetadata {
  specialty: string
  condition?: string
  treatment?: string
  symptoms?: string[]
  urgency: 'low' | 'medium' | 'high'
  diagnosis?: string
  medications?: string[]
  contraindications?: string[]
  procedures?: string[]
  recommendations?: string[]
}

export interface InsuranceMetadata {
  provider: string
  policyType: string
  coverage: string[]
  requirements: string[]
}

export interface PineconeMedicalMetadata {
  type: 'medical'
  title: string
  description: string
  lastUpdated: string
  version: string
  language: string
  status: 'active' | 'inactive' | 'archived'
  templateId: string
  contentId: string
  source: string
  tags: string[]
  medical: string // JSON-String der MedicalMetadata
  interactiveElements: string | null // JSON-String der interaktiven Elemente
  [key: string]: RecordMetadataValue | null
}

export interface PineconeInsuranceMetadata {
  type: 'insurance'
  title: string
  description: string
  lastUpdated: string
  version: string
  language: string
  status: 'active' | 'inactive' | 'archived'
  templateId: string
  contentId: string
  source: string
  tags: string[]
  insurance: string // JSON-String der InsuranceMetadata
  interactiveElements: string | null // JSON-String der interaktiven Elemente
  [key: string]: RecordMetadataValue | null
}

export type PineconeMetadata = 
  | PineconeCityAdministrationMetadata 
  | PineconeMedicalMetadata 
  | PineconeInsuranceMetadata;

export interface PineconeServiceConfig {
  apiKey: string
  environment: string
  baseIndex?: string
}

export interface PineconeService {
  getPinecone(): Pinecone
  getTemplateIndexName(templateId: string): string
  ensureIndexExists(templateId: string, dimension?: number, metric?: 'cosine' | 'euclidean' | 'dotproduct'): Promise<boolean>
  deleteIndex(templateId: string): Promise<boolean>
  getIndexStats(templateId: string): Promise<any>
  upsertVectors(templateId: string, vectors: any[]): Promise<boolean>
  query(templateId: string, queryVector: number[], topK?: number, filter?: Record<string, any>): Promise<any>
  deleteAll(templateId: string): Promise<void>
} 