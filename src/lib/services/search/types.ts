export interface SearchConfig {
  openaiApiKey: string
  pineconeApiKey: string
  pineconeIndex: string
  templateId: string
  language?: string
  redisUrl?: string
  temperature?: number
  maxTokens?: number
  maxRetries?: number
  timeout?: number
  redis?: {
    host?: string
    port?: number
    password?: string
    db?: number
  }
  searchConfig?: {
    maxResults?: number
    minScore?: number
    useCache?: boolean
    timeout?: number
  }
  // Template-spezifische Konfiguration
  systemPrompt?: string
  userPrompt?: string
  followupPrompt?: string
  // Konfiguration für horizontale Skalierung
  host?: string
  port?: number
  serviceDiscovery?: {
    enabled: boolean
    host?: string
    port?: number
  }
  loadBalancing?: {
    enabled: boolean
    strategy?: 'round-robin' | 'least-connections' | 'weighted'
    healthCheck?: {
      interval: number
      timeout: number
    }
    maxRetries?: number
  }
}

export interface SearchContext {
  query: string
  language?: string
  metadata?: Record<string, unknown>
  templateId: string
  sessionId?: string
  history?: Array<{
    content: string | Record<string, unknown>
    role: 'user' | 'assistant'
    timestamp?: string
  }>
}

export interface SearchOptions {
  maxResults?: number
  threshold?: number
  useCache?: boolean
  timeout?: number
  minScore?: number
}

export type ContentType = 'info' | 'warning' | 'error' | 'success'

export interface StructuredResponse {
  type: ContentType
  answer: string
  confidence: number
  metadata?: {
    handler: string
    topics?: string[]
    entities?: string[]
    suggestedQuestions?: string[]
    followup?: string
    deprecated?: boolean
    replacement?: string
    template?: {
      name: string
      [key: string]: any
    }
  }
}

export interface QueryAnalysis {
  intent: string
  entities: Array<{
    type: string
    value: string
  }>
  confidence: number
  topics?: string[]
  requirements?: string[]
  timeframe?: string
  metadata?: Record<string, any>
}

export interface SearchResult {
  content: string
  type: ContentType
  metadata: Record<string, unknown>
  score: number
} 