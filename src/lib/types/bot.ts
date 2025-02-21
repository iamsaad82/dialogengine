import { Example } from './template'
import { HandlerConfig } from './handler'

export interface BaseBotConfig {
  id?: string
  name?: string
  type: BotType
  active: boolean
  metadata?: Record<string, any>
}

export interface SmartSearchConfig extends BaseBotConfig {
  type: 'smart-search'
  urls: string[]
  excludePatterns: string[]
  chunkSize: number
  temperature: number
  maxTokens: number
  systemPrompt: string
  userPrompt: string
  followupPrompt: string
  pinecone: {
    indexName: string
    environment: string
  }
}

export interface FlowiseBotConfig extends BaseBotConfig {
  type: 'flowise'
  flowId: string
  apiKey: string
  apiHost: string
}

export interface TemplateHandlerConfig extends BaseBotConfig {
  type: 'template-handler'
  handlers: string[] // IDs der Handler
  config: {
    matchThreshold: number
    contextWindow: number
    maxTokens: number
    dynamicResponses: boolean
    includeLinks: boolean
    includeMetadata: boolean
  }
}

export interface ExamplesBotConfig extends BaseBotConfig {
  type: 'examples'
  examples: Example[]
  config: {
    matchThreshold: number
    fuzzySearch: boolean
    includeMetadata: boolean
  }
}

export interface DialogEngineConfig extends BaseBotConfig {
  type: 'dialog-engine'
  provider: 'openai' | 'anthropic' | 'mistral'
  model: string
  temperature: number
  systemPrompt: string
  apiKeys?: {
    openai?: string
    anthropic?: string
    mistral?: string
  }
  matchThreshold: number
  contextWindow: number
  maxTokens: number
  dynamicResponses: boolean
  includeLinks: boolean
  includeMetadata: boolean
  streaming: boolean
  fallbackMessage: string
  maxResponseTime: number
}

export type BotType = 'dialog-engine' | 'flowise' | 'examples' | 'template-handler' | 'smart-search'

export type BotConfig = DialogEngineConfig | FlowiseBotConfig | ExamplesBotConfig | TemplateHandlerConfig | SmartSearchConfig

export interface ParsedBot {
  type: BotType
  config: BotConfig
  active: boolean
  metadata?: Record<string, any>
  examples?: Example[]
} 