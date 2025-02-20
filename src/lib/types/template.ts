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
import { DocumentMetadata, DocumentLinks } from '../services/document/types'

export const TemplateTypeEnum = {
  NEUTRAL: 'NEUTRAL',
  CUSTOM: 'CUSTOM'
} as const

export type TemplateType = typeof TemplateTypeEnum[keyof typeof TemplateTypeEnum]

export interface Template {
  id: string
  name: string
  type: string
  active: boolean
  subdomain: string
  createdAt: Date
  updatedAt: Date
  flowiseConfigId: string | null
  branding: BrandingConfig
  config: {
    smartSearch: {
      urls: string[]
      provider: string
      chunkSize: number
      maxTokens: number
      temperature: number
      excludePatterns: string[]
    }
  }
  content: {
    metadata: Record<string, any>
    sections: Section[]
  }
  description: string
  handlers: any[]
  meta: {
    url: string
    image: string
    title: string
    author: string
    keywords: string[]
    description: string
  }
  responses: {
    rules: any[]
    templates: any[]
  }
  bot_config: Record<string, any>
  bot_type: string | null
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
export type ContentType = 'text' | 'list' | 'table' | 'card' | 'link' | 'download' | 'image' | 'video' | 'custom'
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
    contact: {
      text: string
      type: 'email' | 'phone'
      value: string
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

export interface TemplateHandlerConfig {
  handlers: string[] // IDs der template_handlers
  config: Record<string, any>
}

export interface ExamplesBotConfig {
  examples: Example[]
}

export type BotType = 'dialog-engine' | 'flowise' | 'examples'

export type ParsedBot = {
  type: BotType
  config: DialogEngineConfig | FlowiseBotConfig | ExamplesBotConfig
}

export interface ParsedMeta {
  title: string
  description: string
  keywords: string[]
  domain: string
  contactUrl: string
  servicesUrl: string
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

export interface HandlerConfig {
  id: string
  name: string
  type: string
  active: boolean
  capabilities: string[]
  config: {
    patterns: string[]
    metadata: {
      [key: string]: {
        type: string
        required: boolean
        description?: string
      }
    }
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
  }
  metadata?: {
    generated?: boolean
    timestamp?: string
    version?: string
    templateId?: string
  }
}

export interface ResponseMetadata {
  // Basis-Felder
  type?: ResponseType
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

export interface HandlerTemplateConfig {
  responseTypes: string[];
  requiredMetadata: string[];
  customSettings: Record<string, any>;
}

export interface DocumentPattern {
  name: string;
  pattern: string;
  required: boolean;
  examples: string[];
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
  description?: string;
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
  type: BotType
  config: Record<string, any>
  handlers: string[] // Handler-IDs
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

export interface ResponseTemplate {
  id: string
  type: ResponseType
  pattern: string
  components: ResponseComponent[]
  metadata: ResponseMetadata
}

export interface ResponseComponent {
  type: 'text' | 'image' | 'button' | 'list' | 'card'
  content: string
  style?: Record<string, any>
  action?: {
    type: 'link' | 'callback' | 'download'
    payload: any
  }
}

export interface ResponseRule {
  id: string
  condition: {
    type: ResponseType
    metadata?: Record<string, any>
    confidence?: number
  }
  template: string
  fallback?: string
}

export interface ContentSection {
  id: string
  type: 'hero' | 'features' | 'showcase' | 'contact' | 'custom'
  content: Record<string, any>
  style?: Record<string, any>
  metadata?: Record<string, any>
}

export interface Section {
  id: string
  type: string
  title: string
  subtitle?: string
  content: string
  image?: string
  items?: Array<{
    title: string
    description: string
    icon?: string
    image?: string
  }>
}

export interface DialogEngineConfig {
  // Grundeinstellungen
  provider: 'openai' | 'anthropic' | 'mistral'
  model: string
  temperature: number
  systemPrompt: string
  
  // API Keys (optional - falls nicht gesetzt, werden ENV vars verwendet)
  apiKeys?: {
    openai?: string
    anthropic?: string
    mistral?: string
  }
  
  // Sucheinstellungen
  matchThreshold: number
  contextWindow: number
  maxTokens: number
  
  // Antwortoptionen
  dynamicResponses: boolean
  includeLinks: boolean
  includeMetadata: boolean
  
  // Erweiterte Einstellungen
  streaming: boolean
  fallbackMessage: string
  maxResponseTime: number
}

export interface SchemaDefinition {
  type: ContentType;
  properties: Record<string, any>;
  required: string[];
  metadata?: {
    category?: string;
    confidence?: number;
    source?: string;
    [key: string]: any;
  };
} 