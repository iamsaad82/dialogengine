// Response Types
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

// Base Types
export interface BaseMetadata {
  id: string
  type: string
  title: string
  description: string
  lastUpdated: string
  version: string
  language: string
  status: 'active' | 'inactive' | 'archived'
  templateId: string
  contentId: string
  source: string
  tags: string[]
}

// Domain Types
export interface CityAdministrationData {
  department: string
  service: string
  location: string
  contactInfo: {
    email: string
    phone?: string
    address: string
  }
}

export interface MedicalData {
  specialty: string
  condition?: string
  treatment?: string
  symptoms?: string[]
  urgency: 'low' | 'medium' | 'high'
}

export interface InsuranceData {
  provider: string
  policyType: string
  coverage: string[]
  requirements: string[]
}

// Pinecone Types
export interface PineconeCityAdministrationMetadata extends BaseMetadata {
  type: 'cityAdministration'
  cityAdmin: CityAdministrationData
  previousResponses?: Response[]
}

export interface PineconeMedicalMetadata extends BaseMetadata {
  type: 'medical'
  medical: MedicalData
  previousResponses?: Response[]
}

export interface PineconeInsuranceMetadata extends BaseMetadata {
  type: 'insurance'
  insurance: InsuranceData
  previousResponses?: Response[]
}

export type PineconeMetadata = 
  | PineconeCityAdministrationMetadata 
  | PineconeMedicalMetadata 
  | PineconeInsuranceMetadata

// Context Types
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

// Feedback Types
export interface FeedbackData {
  responseId: string
  rating: number
  comment?: string
  source: 'handler' | 'vector' | 'hybrid'
  metadata?: Record<string, unknown>
} 