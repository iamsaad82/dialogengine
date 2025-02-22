import { BaseContentType, ResponseContentTypes } from './contentTypes'

// Gemeinsame Basis-Typen für das gesamte System
export type MetadataFieldType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date'

export interface MetadataDefinition {
  name: string
  type: MetadataFieldType
  required: boolean
  value: string | number | boolean | string[] | object | Date
  description?: string
}

export interface DocumentPattern {
  name: string
  pattern: string
  required: boolean
  confidence: number
  examples: string[]
  extractMetadata?: string[]
}

export interface DocumentMetadata {
  id: string
  type: string
  title: string | null
  language: string
  source: string
  lastModified: string
  templateId: string
  templateMetadata: Record<string, unknown>
  actions: Array<{
    type: 'link' | 'button' | 'form' | 'download' | 'contact'
    label: string
    url: string
    priority: number
  }>
  hasImages: boolean
  contactPoints: Array<{
    type: string
    value: string
    description?: string
  }>
  relatedTopics?: string[]
}

export type RecordMetadata = {
  url: string
  title: string
  text: string
  content: string
  contentType: string
  templateId?: string
  language?: string
  lastModified?: string
  [key: string]: any
}

export type ResponseType = ResponseContentTypes

export interface ValidationRule {
  type: string
  pattern?: string
  message: string
  required?: boolean
  min?: number
  max?: number
  options?: string[]
} 