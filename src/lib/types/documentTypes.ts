import { BaseContentType, ResponseContentType } from './contentTypes'
import { DocumentPattern, MetadataDefinition, ValidationRule } from './common'

export interface DocumentTypeMetadata {
  domain: string
  subDomain: string
  provider?: string
  requirements?: string[]
  coverage?: string[]
  keywords?: string[]
  version?: string
  category?: string
  generated?: boolean
  lastAnalysis?: Date
  confidence?: number
}

export interface CreateDocumentTypeConfig {
  name: string
  description: string
  type: BaseContentType
  patterns: DocumentPattern[]
  metadata: DocumentTypeMetadata
  validation: {
    schemas: string[]      // Verknüpfte Extraktions-Schemas
    handlers: string[]     // Verknüpfte Handler
    rules: ValidationRule[]
  }
  responseConfig: {
    layouts: string[]      // Verknüpfte Layout-IDs
    defaultLayout: string  // Standard-Layout
    conditions: Array<{
      field: string
      operator: string
      value: string
      layout: string
    }>
  }
}

export interface DocumentTypeConfig extends CreateDocumentTypeConfig {
  id: string
}

export interface DocumentTypeDefinition extends DocumentTypeConfig {
  templateId: string
  createdAt: Date
  updatedAt: Date
}

export interface DocumentTypeRegistry {
  register(definition: CreateDocumentTypeConfig): Promise<void>
  get(id: string): Promise<DocumentTypeDefinition | undefined>
  list(): Promise<DocumentTypeDefinition[]>
  update(id: string, definition: Partial<DocumentTypeConfig>): Promise<void>
  remove(id: string): Promise<void>
  validateDocument(content: string, typeId: string): Promise<boolean>
} 