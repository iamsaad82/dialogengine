import { StructuralElement } from './structural'
import { PineconeBaseMetadata } from './pinecone'

/**
 * Basis-Metadaten für erweiterte Pinecone-Einträge
 */
export interface EnhancedPineconeMetadata extends PineconeBaseMetadata {
  content: StructuralElement[]
  additionalContent?: StructuralElement[]
  language: string
  source: string
  tags: string[]
  lastModified: string
}

/**
 * Erweiterte Metadaten nach der Verarbeitung
 */
export interface EnhancedMetadata extends EnhancedPineconeMetadata {
  id: string
  type: string
  title: string
  content: StructuralElement[]
  additionalContent?: StructuralElement[]
  language: string
  source: string
  tags: string[]
  lastModified: string
}

/**
 * Type Guard für erweiterte Metadaten
 */
export function isEnhancedMetadata(metadata: any): metadata is EnhancedMetadata {
  return (
    metadata &&
    metadata.id &&
    metadata.type &&
    metadata.title &&
    Array.isArray(metadata.content) &&
    metadata.language &&
    metadata.source &&
    Array.isArray(metadata.tags) &&
    metadata.lastModified
  )
}

/**
 * Erweiterte Metadaten für Bürgerdienste
 */
export interface CitizenServices {
  onlineServices?: Array<{
    name: string
    description: string
    url: string
    requirements?: string[]
  }>

  appointments?: Array<{
    service: string
    location: string
    date?: string
    duration?: string
    requirements?: string[]
  }>

  documents?: Array<{
    type: string
    requirements: string[]
    processingTime?: string
    fees?: {
      amount: number
      currency: string
    }
  }>
}

/**
 * Erweiterte Metadaten für die Stadtverwaltung
 */
export interface CityAdministrationDomainMetadata {
  services?: Array<{
    name: string
    department: string
    description?: string
    location: string
    contact?: {
      phone?: string
      email?: string
      hours?: string
    }
  }>

  departments?: Array<{
    name: string
    responsibilities: string[]
    location: string
    head?: string
    contact?: {
      phone?: string
      email?: string
      hours?: string
    }
  }>

  announcements?: Array<{
    title: string
    date: string
    type: 'public' | 'construction' | 'event' | 'emergency' | 'other'
    content: string
    validUntil?: string
  }>

  publicSpaces?: Array<{
    name: string
    type: 'park' | 'playground' | 'sports' | 'cultural' | 'other'
    location: string
    amenities?: string[]
    openingHours?: string
  }>

  construction?: Array<{
    project: string
    location: string
    dates: {
      start: string
      end?: string
    }
    status: 'planned' | 'in_progress' | 'completed'
    impact?: string[]
  }>

  wasteManagement?: {
    schedule?: Record<string, string>
    recyclingCenters?: Array<{
      name: string
      location: string
      materials: string[]
      openingHours?: string
    }>
  }

  publicTransport?: {
    lines?: Array<{
      number: string
      type: 'bus' | 'tram' | 'subway'
      route: string[]
    }>
    stations?: Array<{
      name: string
      location: string
      lines: string[]
    }>
    updates?: Array<{
      line: string
      type: 'delay' | 'cancellation' | 'detour' | 'other'
      message: string
      validUntil?: string
    }>
  }

  citizenServices?: CitizenServices
} 