import { z } from 'zod'
import { ContentType } from '../../types/contentTypes'

export interface FirecrawlConfig {
  openaiApiKey: string
  pineconeApiKey: string
  firecrawlApiKey: string
  pineconeEnvironment?: string
  pineconeHost?: string
  pineconeIndex?: string
  redisUrl?: string
}

export interface ScanProgress {
  status: 'running' | 'completed' | 'error'
  pagesScanned: number
  totalPages: number
  error?: string
}

export interface FirecrawlResponse {
  success: boolean;
  id: string;
  url: string
  title: string
  content: string
  metadata: {
    lastModified?: string
    contentType?: string
    language?: string
  }
}

export interface FirecrawlJobResponse {
  success: boolean
  id: string
  url: string
}

export interface FirecrawlJobStatus {
  success: boolean;
  status: string;
  completed: number;
  total: number;
  creditsUsed: number;
  expiresAt: string;
  next?: string;
  data?: Array<{
    markdown: string;
    metadata: {
      url: string;
      title: string;
      scrapeId: string;
      viewport: string;
      sourceURL: string;
      statusCode: number;
      templateId?: string;
    };
  }>;
}

export interface CrawlOptions {
  maxDepth?: number
  timeout?: number
  includePatterns?: string[]
  excludePatterns?: string[]
  followLinks?: boolean
  respectRobotsTxt?: boolean
  userAgent?: string
}

export const DEFAULT_CRAWL_OPTIONS: CrawlOptions = {
  maxDepth: 2,
  timeout: 30000,
  followLinks: true,
  respectRobotsTxt: true,
  userAgent: 'DialogEngine/1.0'
}

export interface CrawlStatus {
  status: 'running' | 'completed' | 'failed'
  pagesScanned: number
  totalPages: number
  error?: string
  data?: Array<{
    markdown: string
    metadata: {
      url: string
      title: string
      [key: string]: any
    }
  }>
}

export interface ExtractOptions {
  prompt?: string
}

export interface ExtractResponse {
  text: string
  metadata: Record<string, any>
}

export interface ExtractResult {
  title: string
  description: string
  services: ServiceData[]
  contact_info: {
    phone?: string
    email?: string
    address?: string
  }
}

export interface ServiceData {
  name: string
  description: string
  requirements?: string[]
  contact?: string
}

export interface CrawlResult {
  url: string
  title: string
  markdown: string
  metadata?: Record<string, any>
}

export interface ProcessedDocument {
  type: ContentType
  confidence: number
  metadata: {
    title?: string
    description?: string
    name?: string
    email?: string
    phone?: string
    address?: string
    buttonText?: string
  }
}

export const extractResponseSchema = z.object({
  type: z.enum(['info', 'service', 'product', 'event', 'location', 'video', 'link', 'contact', 'faq', 'download']),
  confidence: z.number(),
  metadata: z.record(z.any())
}) 