import { ContentType } from '../../types/contentTypes'
import { StructuralElement } from '../../types/structural'

export interface DocumentLinks {
  internal: Array<{
    url: string
    title: string
    context: string
  }>
  external: Array<{
    url: string
    domain: string
    trust: number
  }>
  media: Array<{
    url: string
    type: 'image' | 'video' | 'pdf'
    description: string
  }>
}

export interface DocumentMetadata {
  id: string
  type: ContentType
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
  relatedTopics?: RelatedTopics
}

export interface ProcessedDocument {
  content: string
  metadata: DocumentMetadata
  structuredData: {
    sections: StructuralElement[]
    metadata: Record<string, unknown> & {
      links?: DocumentLinks
    }
  }
}

export interface ExtendedDetectionResult {
  type: ContentType
  confidence: number
  suggestedMetadata: Record<string, unknown>
}

export interface TemplateConfig {
  allowedTypes: ContentType[]
  metadataSchema: Record<string, {
    type: string
    required: boolean
    validation?: (value: unknown) => boolean
  }>
}

export interface ContentValidationResult {
  isValid: boolean
  enrichedMetadata: Record<string, unknown>
  errors?: string[]
}

export interface RelatedTopics {
  topics: string[]
  suggestedQuestions: string[]
  interactiveElements: InteractiveElement[]
}

export interface InteractiveElement {
  type: 'link' | 'button' | 'form' | 'download'
  text: string
  action: string
  priority?: number
}

export type ActionType = 'link' | 'button' | 'form' | 'download' | 'contact' 