import { ContentType } from './contentTypes'

export interface FactMetadata {
  category?: string
  subcategory?: string
  tags?: string[]
  relevance?: number
  context?: string
  name?: string
  phone?: string
  email?: string
  address?: string
  hours?: string
}

export interface Fact {
  id: string
  type: ContentType
  description: string
  confidence: number
  source?: string
  metadata?: FactMetadata
  links?: Array<{
    url: string
    title: string
    type: 'internal' | 'external'
  }>
}

export interface ResponseContext {
  facts: Fact[]
  metadata: Record<string, any>
  settings: {
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
  steps?: string[]
  price?: {
    amount: number
    currency: string
    description?: string
  }
  contact?: {
    name: string
    phone: string
    email: string
    address?: string
    hours?: string
  }
} 