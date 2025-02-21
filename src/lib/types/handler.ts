import { DocumentPattern, MetadataDefinition, ResponseType } from './common'
import { ContentType, BaseContentType } from './contentTypes'
import { MetadataDefinition as TemplateMetadataDefinition } from './template'

export interface HandlerConfig {
  id: string
  name: string
  type: BaseContentType
  active: boolean
  capabilities: string[]
  config: {
    patterns: DocumentPattern[]
    metadata: Record<string, MetadataDefinition>
    settings: {
      matchThreshold: number
      contextWindow: number
      maxTokens: number
      dynamicResponses: boolean
      includeLinks?: boolean
      includeContact?: boolean
      includeSteps?: boolean
      includePrice?: boolean
      includeAvailability?: boolean
      useExactMatches?: boolean
    }
  }
  metadata?: {
    generated?: boolean
    timestamp?: string
    version?: string
    industry?: ContentType
    category?: string
    confidence?: number
    templateId?: string
    [key: string]: any
  }
}

export interface HandlerTemplateConfig {
  name: string
  description: string
  type: string
  capabilities: string[]
  validation: {
    required: boolean
    rules: string[]
  }
  responseTypes: ResponseType[]
  requiredMetadata: string[]
  customSettings: {
    useMarkdown: boolean
    formatDates: boolean
    includeMeta: boolean
    useTemplating: boolean
  }
  patterns: string[]
  metadataDefinitions: Array<{
    name: string
    type: string
    description?: string
    required?: boolean
    validation?: {
      pattern?: string
      min?: number
      max?: number
      options?: string[]
    }
    defaultValue?: any
  }>
}

export interface HandlerType {
  id: string
  label: string
  description?: string
  metadata?: {
    icon?: string
    category?: string
    capabilities?: string[]
  }
} 