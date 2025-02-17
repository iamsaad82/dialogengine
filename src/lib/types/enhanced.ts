import { StructuralElement } from './structural'
import { 
  CityService, 
  Department, 
  Announcement, 
  PublicSpace 
} from './pinecone'

/**
 * Erweiterte Metadaten Basis
 */
export interface EnhancedMetadata {
  id: string
  type: string
  title: string
  content: StructuralElement[]
  additionalContent?: StructuralElement[]
  language?: string
  source?: string
  tags?: string[]
  lastModified?: string
  domain?: Record<string, unknown>
}

/**
 * Erweiterte Stadtverwaltungs-Domain-Metadaten
 */
export interface CityAdministrationDomainMetadata {
  services: CityService[]
  departments: Department[]
  announcements: Announcement[]
  publicSpaces: PublicSpace[]
} 