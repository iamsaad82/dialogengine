import { TopicMetadata } from './analysis'

export interface HandlerSettings {
  matchThreshold: number
  contextWindow: number
  maxTokens: number
  dynamicResponses: boolean
  includeLinks?: boolean
  includeContact?: boolean
  includeSteps?: boolean
  includePrice?: boolean
  includeAvailability?: boolean
  useExactMatches?: boolean
}

export interface HandlerConfig {
  capabilities: string[]
  patterns: string[]
  metadata: TopicMetadata
  settings: HandlerSettings
}

export interface HandlerMetadata {
  generated?: boolean
  timestamp?: string
  documentCount?: number
  lastUpdate?: string
  suggestedMetadata?: TopicMetadata
} 