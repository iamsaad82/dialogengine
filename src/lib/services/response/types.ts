import { PineconeMetadata } from '../../types/pinecone'

export interface BaseResponse {
  content: string
  confidence: number
  type: 'handler' | 'vector' | 'hybrid'
  metadata: ResponseMetadata
}

export interface HandlerResponse extends BaseResponse {
  type: 'handler'
  metadata: HandlerResponseMetadata
}

export interface VectorResponse extends BaseResponse {
  type: 'vector'
  metadata: VectorResponseMetadata
}

export interface HybridResponse extends BaseResponse {
  type: 'hybrid'
  metadata: HybridResponseMetadata
}

export type Response = HandlerResponse | VectorResponse | HybridResponse

export interface ResponseMetadata {
  source: 'handler' | 'vector' | 'hybrid'
  responseId: string
  timestamp: number
  templateId?: string
  handlerId?: string
}

export interface HandlerResponseMetadata extends ResponseMetadata {
  source: 'handler'
  handlerType: string
  templateData?: Record<string, unknown>
}

export interface VectorResponseMetadata extends ResponseMetadata {
  source: 'vector'
  similarity: number
  matchedDocuments?: string[]
}

export interface HybridResponseMetadata extends ResponseMetadata {
  source: 'hybrid'
  handlerConfidence: number
  vectorSimilarity: number
}

export interface ResponseContext {
  templateId: string
  userId?: string
  sessionId?: string
  metadata: PineconeMetadata
  preferences?: {
    language?: string
    format?: string
    maxLength?: number
  }
  previousResponses?: Response[]
} 