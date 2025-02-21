import { DocumentPattern, MetadataDefinition } from './common'

// Basis Content Types für interne Verarbeitung
export const BaseContentTypes = {
  DEFAULT: 'default',
  SERVICE: 'service',
  PRODUCT: 'product',
  ARTICLE: 'article',
  FAQ: 'faq',
  CONTACT: 'contact',
  EVENT: 'event',
  DOWNLOAD: 'download',
  VIDEO: 'video',
  IMAGE: 'image',
  FORM: 'form',
  PROFILE: 'profile',
  LOCATION: 'location',
  TEXT: 'text',
  TUTORIAL: 'tutorial',
  DOCUMENT: 'document'
} as const

// Response Types für die Ausgabe
export enum ResponseContentTypes {
  TEXT = 'text',
  LIST = 'list',
  TABLE = 'table',
  CARD = 'card',
  LINK = 'link',
  DOWNLOAD = 'download',
  IMAGE = 'image',
  VIDEO = 'video',
  CUSTOM = 'custom',
  WARNING = 'warning',
  SUCCESS = 'success',
  STRUCTURED = 'structured',
  MEDIA = 'media',
  INTERACTIVE = 'interactive',
  COMPOSITE = 'composite'
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