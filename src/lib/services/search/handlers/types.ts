import { ContentType } from '@/lib/types/contentTypes'

export interface HandlerConfig {
  templateId: string
  language?: string
  redisUrl?: string
  openaiApiKey?: string
  pineconeApiKey?: string
  pineconeEnvironment?: string
  pineconeIndex?: string
}

export interface HandlerContext {
  query: string
  type: string
  metadata?: {
    history?: Array<{
      role: 'user' | 'assistant'
      content: string
    }>
    previousContext?: {
      role: string
      content: string
      type?: string
      metadata?: {
        requirements?: string[]
        coverage?: string[]
        [key: string]: any
      }
    }
    [key: string]: any
  }
}

export interface HandlerResponse {
  type: ContentType
  text: string
  answer: string
  confidence: number
  metadata: {
    category: string
    source: string
    [key: string]: any
  }
} 