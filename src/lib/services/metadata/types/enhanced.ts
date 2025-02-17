import { BaseMetadata, MediaElement, InteractiveElement, StructuralElement } from './base'
import { ContentType } from '../../../types/contentTypes'

/**
 * Erweiterte Metadaten-Struktur
 */
export interface EnhancedMetadata extends BaseMetadata {
  id: string
  type: ContentType
  lastModified: string
  content: StructuralElement[]
  // Medien-Elemente
  media: {
    images?: MediaElement[]
    videos?: MediaElement[]
    documents?: MediaElement[]
  }

  // Interaktive Elemente
  interactions: {
    buttons?: InteractiveElement[]
    forms?: {
      type: 'form'
      fields: {
        name: string
        type: string
        required: boolean
      }[]
      submitUrl?: string
    }[]
    links?: InteractiveElement[]
  }

  // Strukturelle Elemente
  structure: {
    sections: StructuralElement[]
    lists: StructuralElement[]
    tables?: StructuralElement[]
  }

  // Verknüpfungen
  relations: {
    internalLinks: Array<{
      text: string
      path: string
      context: string
    }>
    externalLinks: Array<{
      text: string
      url: string
      context: string
    }>
    relatedContent?: Array<{
      type: string
      path: string
      relevance: number
    }>
  }

  // Fachspezifische Metadaten (optional)
  domain?: Record<string, unknown>
}

/**
 * Validierungsregeln für erweiterte Metadaten
 */
export const enhancedValidationRules = {
  requiredFields: ['id', 'title', 'type'],
  mediaRules: {
    maxImages: 50,
    maxVideos: 10,
    allowedImageTypes: ['jpg', 'png', 'gif', 'webp'],
    allowedVideoSources: ['youtube.com', 'vimeo.com']
  },
  structureRules: {
    minSections: 1,
    maxDepth: 4
  }
}

/**
 * Medizinische Domain-Metadaten
 */
export interface MedicalDomainMetadata {
  treatments?: Array<{
    name: string
    description?: string
    duration?: string
    requirements?: string[]
  }>
  symptoms?: string[]
  specialists?: string[]
  medications?: Array<{
    name: string
    dosage?: string
    warnings?: string[]
  }>
}

/**
 * Versicherungs-Domain-Metadaten
 */
export interface InsuranceDomainMetadata {
  coverage: {
    included: string[]
    excluded: string[]
    conditions: string[]
  }
  costs?: Array<{
    service: string
    amount: {
      min?: number
      max?: number
      fixed?: number
      currency: string
    }
    conditions?: string[]
  }>
  requirements?: string[]
  processes?: Array<{
    name: string
    steps: string[]
    duration?: string
  }>
}

/**
 * E-Commerce-Domain-Metadaten
 */
export interface CommerceDomainMetadata {
  products?: Array<{
    name: string
    sku?: string
    price: {
      amount: number
      currency: string
    }
    availability: 'in_stock' | 'out_of_stock' | 'pre_order'
    categories?: string[]
  }>
  services?: Array<{
    name: string
    duration?: string
    price?: {
      amount: number
      currency: string
    }
    availability?: string[]
  }>
}

/**
 * Shopping-Center-Domain-Metadaten
 */
export interface ShoppingCenterDomainMetadata {
  news?: Array<{
    title: string
    date: string
    type: 'event' | 'promotion' | 'opening' | 'other'
    description?: string
  }>
  offers?: Array<{
    shop: string
    title: string
    validFrom: string
    validUntil?: string
    discount?: string
    conditions?: string[]
  }>
  services?: Array<{
    name: string
    location: string
    openingHours?: string
    description?: string
    contact?: {
      phone?: string
      email?: string
    }
  }>
  shops?: Array<{
    name: string
    category: string
    location: string
    floor: string
    openingHours?: string
    description?: string
    brands?: string[]
  }>
  facilities?: Array<{
    type: 'parking' | 'restroom' | 'info' | 'atm' | 'locker' | 'charging' | 'other'
    location: string
    floor: string
    details?: string
  }>
  events?: Array<{
    title: string
    date: string
    location: string
    type: 'sale' | 'entertainment' | 'seasonal' | 'kids' | 'other'
    description?: string
  }>
  openingHours?: {
    regular: Record<string, string>
    special?: Record<string, string>
  }
  accessibility?: {
    parking: boolean
    elevator: boolean
    wheelchair: boolean
    additional?: string[]
  }
}

/**
 * Stadtverwaltungs-Domain-Metadaten
 */
export interface CityAdministrationDomainMetadata {
  services?: Array<{
    name: string
    department: string
    description?: string
    requirements?: string[]
    location?: string
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
    contact: {
      phone?: string
      email?: string
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
    facilities?: string[]
    openingHours?: string
    events?: Array<{
      name: string
      date: string
      description?: string
    }>
  }>
  construction?: Array<{
    project: string
    location: string
    startDate: string
    endDate?: string
    status: 'planned' | 'in_progress' | 'completed'
    impact?: string[]
    updates?: Array<{
      date: string
      content: string
    }>
  }>
  wasteManagement?: {
    schedule?: Record<string, string>
    recyclingCenters?: Array<{
      name: string
      location: string
      acceptedMaterials: string[]
      openingHours: string
    }>
    specialCollections?: Array<{
      type: string
      date: string
      areas: string[]
    }>
  }
  publicTransport?: {
    lines?: Array<{
      number: string
      type: 'bus' | 'tram' | 'subway'
      route: string[]
      schedule?: string
    }>
    stations?: Array<{
      name: string
      location: string
      lines: string[]
      facilities?: string[]
    }>
    updates?: Array<{
      line: string
      type: 'delay' | 'cancellation' | 'detour' | 'other'
      message: string
      validUntil?: string
    }>
  }
  citizenServices?: {
    onlineServices?: Array<{
      name: string
      description: string
      url: string
      requirements?: string[]
    }>
    appointments?: Array<{
      service: string
      nextAvailable?: string
      location: string
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
} 