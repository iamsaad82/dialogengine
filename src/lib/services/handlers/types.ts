import { ContentType } from '../search/types'

/**
 * @status active
 * @lastModified 2024-02
 */
export type HandlerType = 'welcome' | 'faq' | 'help' | 'dynamic'

/**
 * @status active
 * @usage high
 */
export interface HandlerConfig {
  type: HandlerType
  name: string
  description?: string
  patterns?: string[]
  keywords?: string[]
  active: boolean
  priority: number
  responseType: ContentType
  template?: {
    response?: string
    followup?: string
  }
  metadata?: {
    keyTopics?: string[]
    entities?: string[]
    facts?: string[]
    links?: {
      internal: string[]
      external: string[]
      media: string[]
    }
    relatedTopics?: {
      topics: string[]
      suggestedQuestions: string[]
      interactiveElements: any[]
    }
  }
}

export interface DynamicHandlerMetadata {
  keyTopics: string[]
  entities: string[]
  facts: string[]
  links: {
    internal: string[]
    external: string[]
    media: string[]
  }
  relatedTopics: {
    topics: string[]
    suggestedQuestions: string[]
    interactiveElements: any[]
  }
}

export interface DynamicHandlerConfig extends Omit<HandlerConfig, 'type' | 'metadata'> {
  type: 'dynamic'
  metadata: DynamicHandlerMetadata
  responses: Array<{
    type: string
    templates: string[]
    conditions?: {
      patterns?: string[]
      metadata?: Record<string, any>
    }
  }>
  settings: {
    matchThreshold: number
    contextWindow: number
    maxTokens: number
    dynamicResponses: boolean
    includeLinks: boolean
    includeContact?: boolean
    includeSteps?: boolean
  }
}

export interface HandlerRequest {
  query: string
  type: ContentType
  metadata?: Record<string, any>
}

export interface HandlerMatch {
  handler: string
  confidence: number
  metadata?: Record<string, any>
}

export interface HandlerResponse {
  type: ContentType
  content: string
  metadata?: Record<string, any>
  followup?: string
} 