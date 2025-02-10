import { z } from 'zod'
import {
  templateTypeSchema,
  iconTypeSchema,
  featureSchema,
  exampleSchema,
  responseTypeSchema,
  contentSchema,
  brandingSchema,
  botSchema,
  metaSchema,
  templateSchema
} from '../schemas/template'
import { ContentType, ContentMetadata } from './contentTypes'

export const TemplateTypeEnum = {
  CUSTOM: 'CUSTOM',
  FLOWISE: 'FLOWISE'
} as const

export type TemplateType = typeof TemplateTypeEnum[keyof typeof TemplateTypeEnum]

export interface Template {
  id: string
  name: string
  type: TemplateType
  active: boolean
  subdomain: string
  jsonContent: string | null
  jsonBranding: string | null
  jsonBot: string | null
  jsonMeta: string | null
  createdAt: Date
  updatedAt: Date
  flowiseConfigId: string | null
  flowiseConfig: any | null
}

export type ParsedTemplate = {
  id: string
  name: string
  type: z.infer<typeof templateTypeSchema>
  active: boolean
  subdomain: string | null
  jsonContent: any
  jsonBranding: any
  jsonBot: any
  jsonMeta: any
  createdAt: Date
  updatedAt: Date
  flowiseConfig?: any
  flowiseConfigId?: string
}

export type DbTemplate = Template

export type IconType = z.infer<typeof iconTypeSchema>
export type ResponseType = ContentType

export type Feature = z.infer<typeof featureSchema>
export type Example = z.infer<typeof exampleSchema>
export interface ParsedContent {
  hero: {
    title: string
    subtitle?: string
    description: string
  }
  showcase: {
    image: string
    altText: string
    context: {
      title: string
      description: string
    }
    cta: {
      title: string
      question: string
    }
  }
  features: Array<{
    icon: string
    title: string
    description: string
  }>
  contact?: {
    title: string
    description: string
    email: string
    buttonText: string
  }
  dialog?: {
    title: string
    description: string
  }
}
export interface ParsedBranding {
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  textColor: string
  logo: string
  font: string
}

export interface SmartSearchConfig {
  provider: 'openai';
  urls: string[];
  excludePatterns: string[];
  chunkSize: number;
  temperature: number;
  reindexInterval: number;
  maxTokensPerRequest: number;
  maxPages: number;
  useCache: boolean;
  similarityThreshold: number;
  apiKey: string;
  indexName: string;
  apiEndpoint: string;
  templateId?: string;
}

export interface ParsedBot {
  type: 'smart-search' | 'flowise'
  smartSearch?: {
    provider: string
    urls: string[]
    excludePatterns: string[]
    chunkSize: number
    temperature: number
    reindexInterval: number
    maxTokensPerRequest: number
    maxPages: number
    useCache: boolean
    similarityThreshold: number
    apiKey: string
    indexName: string
  }
  flowise?: {
    chatflowId: string
    apiHost: string
    apiKey: string
  }
}

export interface ParsedMeta {
  title: string
  description: string
  keywords: string[]
}

export interface ExampleMetadata {
  url?: string;
  image?: string;
  price?: string;
  date?: string;
  time?: string;
  sessions?: string;
  available?: boolean | string;
  address?: string;
  buttonText?: string;
  videoUrl?: string;
  fileSize?: string;
  fileType?: string;
  relatedQuestions?: string;
  title?: string;
}

export interface SmartSearch {
  provider: 'openai'
  urls: string[]
  excludePatterns: string[]
  chunkSize: number
  temperature: number
  reindexInterval: number
  maxTokensPerRequest: number
  maxPages: number
  useCache: boolean
  similarityThreshold: number
  apiKey: string
  indexName: string
  apiEndpoint: string
}

export interface ResponseMetadata {
  // Basis-Felder
  type?: ContentType
  title?: string
  description?: string
  
  // Service & Produkt
  price?: string
  available?: boolean
  
  // Event
  date?: string
  time?: string
  location?: string
  buttonText?: string
  
  // Media
  image?: string
  videoUrl?: string
  thumbnail?: string
  
  // Links
  url?: string
  
  // Kontakt
  name?: string
  email?: string
  phone?: string
  address?: string
  
  // Downloads
  fileType?: string
  fileSize?: string
  
  // FAQ
  question?: string
  answer?: string
  relatedQuestions?: string[]
  
  // Zusätzliche Metadaten
  confidence?: number
  source?: string
  lastUpdated?: string
}

export interface SearchSource {
  url: string
  title: string
  snippets: Array<{
    text: string
    score: number
  }>
}

export interface StructuredResponse {
  type: ResponseType
  text: string
  metadata: ResponseMetadata
  sources: SearchSource[]
}

export interface UploadStatus {
  stage: 'uploading' | 'processing' | 'analyzing' | 'indexing' | 'complete' | 'error'
  progress: number
  message: string
  details?: {
    documentsProcessed?: number
    totalDocuments?: number
    currentDocument?: string
    detectedTypes?: Array<{
      type: ResponseType
      confidence: number
      count: number
    }>
  }
}

export interface ContentTypeError {
  type: 'unknown_type' | 'low_confidence' | 'missing_metadata' | 'invalid_format'
  message: string
  suggestedType?: ResponseType
  originalContent?: {
    url: string
    title: string
    excerpt: string
  }
}

export interface ContentTypeResult {
  type: ResponseType
  confidence: number
  metadata: ResponseMetadata
  error?: ContentTypeError
} 