import { DocumentPattern, MetadataDefinition } from './common'

// Basis Content Types für interne Verarbeitung
export const BaseContentTypes = {
  DEFAULT: 'standard',
  SERVICE: 'dienstleistung',
  PRODUCT: 'produkt',
  ARTICLE: 'artikel',
  FAQ: 'faq',
  CONTACT: 'kontakt',
  EVENT: 'veranstaltung',
  DOWNLOAD: 'download',
  VIDEO: 'video',
  IMAGE: 'bild',
  FORM: 'formular',
  PROFILE: 'profil',
  LOCATION: 'standort',
  TEXT: 'text',
  TUTORIAL: 'anleitung',
  DOCUMENT: 'dokument'
} as const

// Response Types für die Ausgabe
export enum ResponseContentTypes {
  TEXT = 'text',
  LIST = 'liste',
  TABLE = 'tabelle',
  CARD = 'karte',
  LINK = 'link',
  DOWNLOAD = 'download',
  IMAGE = 'bild',
  VIDEO = 'video',
  CUSTOM = 'benutzerdefiniert',
  WARNING = 'warnung',
  SUCCESS = 'erfolg',
  STRUCTURED = 'strukturiert',
  MEDIA = 'medien',
  INTERACTIVE = 'interaktiv',
  COMPOSITE = 'zusammengesetzt'
}

// Type definitions
export type BaseContentType = typeof BaseContentTypes[keyof typeof BaseContentTypes]
export type ResponseContentType = ResponseContentTypes
export type ResponseType = ResponseContentType
export type ContentType = BaseContentType

// Helper object for easy access
export const ContentTypes = {
  ...BaseContentTypes,
  ...ResponseContentTypes
} as const

// Type guards
export function isBaseContentType(type: string): type is BaseContentType {
  return true // Erlaubt dynamische Types
}

export function isResponseContentType(type: string): type is ResponseContentType {
  return Object.values(ResponseContentTypes).includes(type as ResponseContentType)
}

export function isValidContentType(type: string): type is ContentType {
  return Object.values(BaseContentTypes).includes(type as BaseContentType) || type.length > 0
}

// Interface definitions
export interface ContentTypeMetadata {
  title?: string
  description?: string
  classification?: {
    type: BaseContentType
    purpose?: string
    confidence: number
  }
  domain?: string
  subDomain?: string
  keywords?: string[]
  requirements?: string[]
  coverage?: string[]
  provider?: string
  contactPoints?: any[]
  version?: string
  category?: string
}

export interface ContentTypeDefinition {
  id: string
  type: BaseContentType
  name: string
  description?: string
  metadata: ContentTypeMetadata
  patterns?: DocumentPattern[]
  validators?: Array<(content: string) => Promise<boolean>>
  validation?: {
    patterns: DocumentPattern[]
    required: string[]
    rules: string[]
  }
  templateId?: string  // Referenz zum Template
}

export interface ContentTypeConfig {
  type: ContentType
  patterns: string[]
  weight: number
}

export interface ContentTypeMap {
  [key: string]: string[]
}

export interface ExtendedDetectionResult {
  type: BaseContentType
  confidence: number
  patterns: Array<{ 
    pattern: string
    matches: string[] 
  }>
  weight: number
  metadata: {
    domain: string
    subDomain: string
    classification?: {
      type: string
      purpose: string
      audience: string
    }
    relationships?: {
      parentTopic: string
      relatedTopics: string[]
      possibleMergeTargets: string[]
    }
    keywords?: string[]
    requirements?: string[]
    provider?: string
    coverage?: string[]
    nextSteps?: string[]
    contactPoints?: Array<{
      type: string
      value: string
      description?: string
    }>
    generated?: boolean
    timestamp?: string
    source?: string
    [key: string]: any
  }
  suggestedMetadata: Record<string, unknown>
}

// Registry für dynamische Content-Types
export interface ContentTypeRegistry {
  register(definition: ContentTypeDefinition): Promise<void>;
  get(id: string): Promise<ContentTypeDefinition | undefined>;
  list(): Promise<ContentTypeDefinition[]>;
  update(id: string, definition: Partial<ContentTypeDefinition>): Promise<void>;
  remove(id: string): Promise<void>;
  validateContent(content: string, typeId: string): Promise<boolean>;
}

// Error types
export interface ContentTypeError {
  type: 'unknown_type' | 'low_confidence' | 'missing_metadata' | 'invalid_format'
  message: string
  suggestedType?: ContentType
  originalContent?: {
    url: string
    title: string
    excerpt: string
  }
}

export interface ContentTypeResult {
  type: ContentType
  confidence: number
  metadata: ContentTypeMetadata
  error?: ContentTypeError
}

// Re-export common types
export type { DocumentPattern, MetadataDefinition } 