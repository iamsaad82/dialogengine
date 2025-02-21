import { DocumentPattern, MetadataDefinition } from './common'
import { ContentType, ResponseType } from './contentTypes'

export type { DocumentPattern, MetadataDefinition, ContentType, ResponseType }

export interface PropertyDefinition {
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object'
  required?: boolean
  description?: string
  enum?: string[]
  items?: PropertyDefinition // Für Arrays
  properties?: Record<string, PropertyDefinition> // Für Objects
  extractors?: Array<{
    type: 'regex' | 'ai' | 'custom'
    config: Record<string, any>
  }>
  validation?: {
    min?: number
    max?: number
    pattern?: string
    enum?: string[]
  }
}

export interface SchemaDefinition {
  type: ContentType
  properties: Record<string, any>
  required: string[]
  validators?: Record<string, ValidatorFunction>
  metadata?: {
    category?: string
    confidence?: number
    source?: string
    [key: string]: any
  }
}

export type ValidatorFunction = (value: unknown) => boolean | Promise<boolean>

export interface SchemaValidationResult {
  isValid: boolean
  errors?: string[]
  metadata?: Record<string, unknown>
}

export interface ExtractionSchemaFields {
  name?: string;
  patterns: Array<DocumentPattern>;
  metadata: Array<MetadataDefinition>;
  version: number;
  settings: Record<string, any>;
  responseTypes: Array<{
    type: ContentType;
    schema: SchemaDefinition;
    templates: string[];
  }>;
}

export interface ExtractionSchema {
  id: string
  templateId: string
  name: string
  description?: string
  version: number
  fields: ExtractionSchemaFields
  createdAt: Date
  updatedAt: Date
  metadata?: {
    lastAnalysis?: Date
    documentCount?: number
    extractedTypes?: Array<{
      type: ContentType
      count: number
      confidence: number
    }>
    performance?: {
      averageProcessingTime: number
      successRate: number
    }
  }
} 