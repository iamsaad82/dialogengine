export interface SearchConfig {
  openaiApiKey: string
  pineconeApiKey: string
  pineconeIndex: string
  anthropicApiKey?: string
  temperature?: number
  maxTokens?: number
  redisUrl?: string
  templateId: string
  maxTokensPerRequest?: number
  similarityThreshold?: number
  language?: string
  processingTime?: number
}

export interface SearchOptions {
  language?: string
  maxResults?: number
  minScore?: number
  filterTypes?: string[]
  includeMetadata?: boolean
  includeSources?: boolean
}

export interface VectorizationConfig {
  dimensions: number
  metric: 'cosine' | 'euclidean' | 'dotproduct'
  indexName: string
  batchSize?: number
  namespace?: string
} 