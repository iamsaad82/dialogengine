import { ContentType, ContentMetadata as BaseContentMetadata } from '@/lib/types/contentTypes'

export interface ContentMetadata extends BaseContentMetadata {
  // Kontext-spezifische Metadaten
  previousContext?: {
    query: string
    type: ContentType
    metadata?: ContentMetadata
  }
  history?: Array<{
    role: string
    content: string
  }>
  topics?: string[]
  query?: string
}

export interface StructuredResponse {
  type: ContentType
  text: string
  metadata: ContentMetadata
}

export interface SearchResult {
  url: string
  title: string
  content: string
  score: number
  metadata: ContentMetadata & {
    type?: ContentType
    url?: string
    title?: string
  }
  snippets?: Array<{
    text: string
    score: number
  }>
}

export interface QueryAnalysis {
  intent: string
  topics: string[]
  requirements?: string[]
  timeframe?: string
  expectedActions?: string[]
}

export interface SearchContext {
  query: string
  history?: Array<{
    role: string
    content: string
  }>
  templateId: string
  language?: string
} 