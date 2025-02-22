import type { BaseContentType } from '../contentTypes'
import type { DocumentPattern, MetadataDefinition } from '../common'

export type SchemaFieldType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object'

export interface SchemaField {
  name: string
  type: SchemaFieldType
  description?: string
  required?: boolean
  isArray?: boolean
  properties?: SchemaField[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
    enum?: string[]
  }
}

export interface ExtractionSchema {
  id: string
  templateId: string
  name: string
  description: string
  version: number
  fields: ExtractionSchemaFields
  createdAt: Date
  updatedAt: Date
  metadata?: {
    generated?: boolean
    lastAnalysis?: Date
    documentCount?: number
    extractedTypes?: Array<{
      type: BaseContentType
      count: number
      confidence: number
    }>
    performance?: {
      averageProcessingTime: number
      successRate: number
    }
  }
}

export interface ExtractionSchemaFields {
  name: string
  patterns: DocumentPattern[]
  metadata: MetadataDefinition[]
  version: number
  settings: {
    confidence: number
    requiresValidation: boolean
  }
  responseTypes: Array<{
    type: BaseContentType
    schema: SchemaDefinition
    templates: string[]
  }>
}

export interface SchemaDefinition {
  type: BaseContentType
  properties: {
    [key: string]: {
      type: string
      description?: string
      properties?: {
        [key: string]: {
          type: string
        }
      }
    }
  }
  required?: string[]
}

export interface SchemaValidationResult {
  isValid: boolean
  errors?: string[]
  metadata?: Record<string, unknown>
} 