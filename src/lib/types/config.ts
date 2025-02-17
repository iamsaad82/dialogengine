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