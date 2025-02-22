import { ContentTypeDefinition, BaseContentTypes } from '../contentTypes'
import { MetadataDefinition } from '../common'

export * from './job'

export interface UploadOptions {
  maxTokens?: number
  avgCharsPerToken?: number
  overlapTokens?: number
  chunkSize?: number
  minChunkSize?: number
  retryLimit?: number
  rateLimitDelay?: number
}

export interface ChunkMetadata {
  chunk_index: string
  chunk_total: string
  chunk_token_count: string
  chunk_retry_count: string
  section_range_start: string
  section_range_end: string
  [key: string]: string
}

export interface VectorMetadata extends Record<string, any> {
  filename: string
  path: string
  templateId: string
  section_type?: string
  section_confidence?: number
  section_metadata?: string
  type?: string
  confidence?: number
  timestamp?: string
}

export interface VectorResult {
  vectors: Array<{
    id: string
    values: number[]
    metadata: VectorMetadata
  }>
  metadata?: {
    count: number
    timestamp: string
    templateId: string
    processingStats?: {
      totalChunks: number
      successfulChunks: number
      averageTokensPerChunk: number
    }
  }
}

export interface TopicMetadata {
  domain: string
  subDomain: string
  keywords: string[]
  coverage: string[]
  relationships: {
    relatedTopics: string[]
  }
}

export interface TopicSection {
  id: string
  type: typeof BaseContentTypes[keyof typeof BaseContentTypes]
  title: string
  content: string
  confidence: number
  metadata: TopicMetadata
}

export interface TopicCluster {
  mainTopic: TopicSection
  relatedTopics: TopicSection[]
  confidence: number
  metadata: TopicMetadata
}

export interface ContentAnalysis {
  type: string;
  confidence: number;
  metadata?: {
    domain?: string;
    subDomain?: string;
    provider?: string;
    serviceType?: string;
    requirements?: string[];
    coverage?: string[];
    nextSteps?: string[];
    relatedTopics?: string[];
    deadlines?: string[];
    contactPoints?: Array<{
      type: string;
      value: string;
      description?: string;
    }>;
    media?: {
      images?: Array<{
        url: string;
        alt?: string;
        caption?: string;
      }>;
      videos?: Array<{
        url: string;
        title?: string;
        description?: string;
      }>;
      files?: Array<{
        url: string;
        name: string;
        type: string;
        size?: number;
      }>;
      links?: Array<{
        url: string;
        title?: string;
        type?: string;
      }>;
    };
    interactive?: {
      forms?: Array<{
        id: string;
        type: string;
        fields: Array<{
          name: string;
          type: string;
          required: boolean;
        }>;
      }>;
      buttons?: Array<{
        text: string;
        action?: string;
        type?: string;
      }>;
      calculators?: Array<{
        id: string;
        type: string;
        inputs: string[];
        outputs: string[];
      }>;
    };
  };
  fields?: Record<string, any>;
  sections?: Array<{
    title: string;
    content: string;
    type?: string;
  }>;
}

export interface ProcessingError extends Error {
  code?: string
  status?: number
  retryable?: boolean
  context?: {
    operation: string
    chunk?: number
    totalChunks?: number
    metadata?: Record<string, any>
  }
}

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

// Re-export other types
export * from './handler'
export * from './template' 