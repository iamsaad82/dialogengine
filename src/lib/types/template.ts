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
import { ContentType } from './contentTypes'
import { DocumentMetadata, DocumentLinks } from '../services/document/types'

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
  description: string
  config: {
    examples?: string[]
    flowiseId?: string
    smartSearch?: SmartSearchConfig
  }
  handlers?: HandlerConfig[]
  branding?: BrandingConfig
  showcase?: ShowcaseConfig
  meta?: MetaConfig
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

export interface FlowiseBotConfig {
  flowId: string
  apiKey: string
}

export interface AOKBotConfig {
  pineconeApiKey: string
  pineconeEnvironment: string
  pineconeIndex: string
  openaiApiKey: string
}

export interface ParsedBot {
  type: 'smart-search' | 'flowise' | 'aok-handler' | 'examples'
  smartSearch?: SmartSearchConfig
  flowise?: FlowiseBotConfig
  aokHandler?: AOKBotConfig
  examples?: Example[]
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
    currentOperation?: string
    processingDetails?: {
      stage: string
      progress: number
      info?: string
      subStage?: string
      timeRemaining?: string
      processedItems?: number
      totalItems?: number
    }
    detectedTypes?: Array<{
      type: ResponseType
      confidence: number
      count: number
    }>
    errors?: Array<{
      type: string
      message: string
      timestamp: string
    }>
    warnings?: Array<{
      type: string
      message: string
      timestamp: string
    }>
    performance?: {
      startTime: string
      currentDuration: string
      estimatedTimeRemaining?: string
      averageSpeed?: string
    }
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

interface PineconeConfig {
  environment: string
  index: string
}

interface HandlerSettings {
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
  pineconeConfig?: PineconeConfig
}

interface HandlerMetadata {
  keyTopics: string[]
  entities: string[]
  facts: string[]
}

export interface HandlerConfig {
  type: ContentType
  active: boolean
  metadata: HandlerMetadata
  responses: string[]
  settings: HandlerSettings
}

export interface HandlerTemplateConfig {
  responseTypes: string[];
  requiredMetadata: string[];
  customSettings: Record<string, any>;
}

export interface DocumentPattern {
  name: string;
  pattern: string;
  required: boolean;
  extractMetadata?: string[];
}

export interface SectionDefinition {
  name: string;
  startPattern: string;
  endPattern: string;
  required: boolean;
  extractors?: string[];
}

export interface MetadataDefinition {
  name: string;
  type: 'string' | 'string[]' | 'date' | 'boolean' | 'number' | 'object';
  required: boolean;
  pattern?: string;
  defaultValue?: any;
}

export interface ExtractorConfig {
  name: string;
  type: 'regex' | 'ai' | 'custom';
  config: Record<string, any>;
}

export interface TemplateConfig {
  id: string;
  name: string;
  version: string;
  structure: {
    patterns: DocumentPattern[];
    sections: SectionDefinition[];
    metadata: MetadataDefinition[];
    extractors: ExtractorConfig[];
  };
  handlerConfig: HandlerTemplateConfig;
}

export interface BotConfig {
  type: 'examples' | 'flowise' | 'smart-search' | 'aok-handler'
  examples?: Example[]
  flowiseId?: string
  smartSearch?: SmartSearchConfig
  aokHandler?: {
    pineconeApiKey: string
    pineconeEnvironment: string
    pineconeIndex: string
    openaiApiKey: string
  }
  handlers?: {
    [templateId: string]: HandlerConfig[]
  }
}

export interface BrandingConfig {
  logo: string
  colors: {
    primary: string
    secondary: string
    accent: string
  }
  fonts: {
    heading: string
    body: string
  }
}

export interface ShowcaseConfig {
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

export interface MetaConfig {
  title: string
  description: string
  keywords: string[]
  author: string
  image: string
  url: string
} 