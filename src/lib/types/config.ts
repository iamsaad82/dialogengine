import { DocumentPattern } from './contentTypes'
import { SchemaDefinition } from './schema'

export interface SearchConfig {
  openaiApiKey: string
  pineconeApiKey: string
  searchConfig?: {
    maxResults?: number
    minScore?: number
    filters?: Record<string, any>
  }
  systemPrompt?: string
  userPrompt?: string
  followupPrompt?: string
}

export interface PineconeConfig {
  indexName?: string
  environment?: string
  cloud?: 'gcp' | 'aws'
  region?: string
  dimension?: number
  metric?: 'cosine' | 'euclidean' | 'dotproduct'
}

export interface SmartSearchConfig {
  urls: string[]
  temperature: number
  maxTokens: number
  systemPrompt?: string
  userPrompt?: string
  followupPrompt?: string
  pinecone: PineconeConfig
  excludePatterns: string[]
  chunkSize: number
  provider: 'openai'
  reindexInterval: number
  maxTokensPerRequest: number
  maxPages: number
  useCache: boolean
  similarityThreshold: number
  apiKey?: string
}

export interface TemplateConfig {
  id: string
  name: string
  version: string
  structure: {
    patterns: Array<{
      name: string
      pattern: string
      required: boolean
      examples: string[]
      extractMetadata?: string[]
    }>
    sections: Array<{
      id: string
      type: string
      required: boolean
      fields: string[]
    }>
    metadata: Record<string, any>
    extractors: Array<{
      field: string
      pattern: string
      metadata: string[]
    }>
  }
  handlerConfig: {
    responseTypes: string[]
    requiredMetadata: string[]
    customSettings: {
      useMarkdown: boolean
      formatDates: boolean
      includeMeta: boolean
    }
  }
} 