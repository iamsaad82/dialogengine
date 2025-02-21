import { z } from 'zod'
import {
  templateTypeSchema,
  iconTypeSchema,
  featureSchema,
  exampleSchema
} from '../schemas/template'
import { ContentType, BaseContentType } from './contentTypes'
import { HandlerConfig } from './handler'
import { ParsedBot, BotType, FlowiseBotConfig, ExamplesBotConfig } from './bot'
import type { 
  MetadataDefinition, 
  DocumentPattern, 
  ResponseType 
} from './common'

// Basic template types
export const TemplateTypeEnum = {
  NEUTRAL: 'NEUTRAL',
  CUSTOM: 'CUSTOM'
} as const

export type TemplateType = typeof TemplateTypeEnum[keyof typeof TemplateTypeEnum]
export type IconType = z.infer<typeof iconTypeSchema>
export type Feature = z.infer<typeof featureSchema>
export type Example = z.infer<typeof exampleSchema>

// Error types
export type ContentTypeError = {
  type: 'unknown_type' | 'low_confidence' | 'missing_metadata' | 'invalid_format'
  message: string
}

// Branding configuration
export interface BrandingConfig {
  logo?: string
  colors: {
    primary: string
    secondary?: string
    accent?: string
  }
  fonts: {
    primary: string
    secondary?: string
    headings?: string
  }
  customCss?: string
}

// Re-export types
export type { HandlerConfig }
export type { BaseContentType }
export type { SchemaDefinition } from './schema'
export type { TemplateConfig } from './config'
export type { HandlerTemplateConfig } from './handler'
export type { UploadStatus } from './upload'
export type { RecordMetadata } from './record'
export type { MetadataDefinition, DocumentPattern, ResponseType }
export type { ParsedBot, BotType, FlowiseBotConfig, ExamplesBotConfig }

// Core interfaces
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

export interface MetaConfig {
  title: string
  description: string
  keywords: string[]
  author: string
  image: string
  url: string
}

export interface Template {
  id: string
  name: string
  type: string
  active: boolean
  subdomain: string | null
  createdAt: Date
  updatedAt: Date
  flowiseConfigId: string | null
  branding: BrandingConfig | string
  bot_config: ParsedBot
  handlers: HandlerConfig[]
  meta: MetaConfig
  content: {
    metadata: Record<string, any>
    sections: Section[]
  }
  description: string | null
}

export interface ParsedTemplate {
  id: string
  name: string
  type: z.infer<typeof templateTypeSchema>
  active: boolean
  subdomain: string | null
  jsonContent: string | ParsedContent
  jsonBranding: string | ParsedBranding
  jsonBot: string | ParsedBot
  jsonMeta: string | MetaConfig
  createdAt: Date
  updatedAt: Date
  flowiseConfig?: any
  flowiseConfigId?: string
}

export interface ParsedBranding {
  logo?: string
  colors: {
    primary: string
    secondary?: string
    headings?: string
    body?: string
    primaryColor?: string  // Für Abwärtskompatibilität
  }
  fonts: {
    primary: string
    secondary?: string
    headings?: string
  }
  customCss?: string
}

export interface ParsedContent {
  hero: {
    title: string
    subtitle: string
    description: string
    image: string
  }
  features: Feature[]
  examples: Example[]
  showcase?: {
    title: string
    image: string
    altText: string
    context: {
      title: string
      description: string
    }
    cta: {
      title: string
      hint: string
      question: string
    }
    items: Array<{
      title: string
      description: string
      image?: string
    }>
  }
  contact: {
    title: string
    email: string
    phone: string
    address: string
    hours?: string
    description: string
    buttonText: string
  }
  dialog: {
    title: string
    description: string
    examples: Array<{
      question: string
      answer: string
    }>
  }
  metadata?: Record<string, any>
}

export interface ResponseTemplate {
  id: string
  type: ContentType
  content: string
  metadata?: Record<string, any>
}

export interface DialogEngineConfig {
  id: string
  name: string
  description?: string
  metadata?: Record<string, any>
  matchThreshold: number
  contextWindow: number
  maxTokens: number
  dynamicResponses: boolean
  includeLinks: boolean
  includeMetadata: boolean
  streaming: boolean
  fallbackMessage: string
  maxResponseTime: number
  type?: string
  active?: boolean
}

export interface ContentTypeResult {
  type: string
  confidence: number
  metadata: Record<string, any>
  error?: ContentTypeError
}

export type DbTemplate = Template 