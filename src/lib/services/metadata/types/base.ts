import { ContentType } from '../../../types/contentTypes'

/**
 * Basis-Metadaten Interface
 */
export interface BaseMetadata {
  id: string
  type: ContentType
  title: string
  description: string
  lastUpdated: string
  language: string
}

/**
 * Media-Element Interface
 */
export interface MediaElement {
  type: 'image' | 'video' | 'document'
  url: string
  title?: string
  mimeType?: string
  size?: number
  context?: string
}

/**
 * Interaktives Element Interface
 */
export interface InteractiveElement {
  type: 'button' | 'link' | 'form'
  text: string
  action?: string
  url?: string
  context?: string
  metadata?: Record<string, unknown>
}

/**
 * Strukturelles Element Interface
 */
export interface StructuralElement {
  type: 'section' | 'list' | 'table'
  title?: string
  content: string | string[]
  level?: number
  context?: string
}

/**
 * Validierungs-Regeln Interface
 */
export interface ValidationRule {
  type: 'required' | 'format' | 'range' | 'custom'
  message: string
  validator: (value: unknown) => boolean | Promise<boolean>
}

/**
 * Metadaten-Extractor Interface
 */
export interface MetadataExtractor<T extends BaseMetadata> {
  extract(content: string): Promise<T>
  validate(metadata: T): Promise<boolean>
}

/**
 * Metadaten-Processor Interface
 */
export interface MetadataProcessor<T extends BaseMetadata, R> {
  process(metadata: T): Promise<R>
  enrich(metadata: T): Promise<T>
} 