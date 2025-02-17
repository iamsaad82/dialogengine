import { Redis } from 'ioredis'
import { SearchMonitoring } from '../monitoring/SearchMonitoring'
import { StructuredResponse, ContentType } from '../search/types'
import { HandlerConfig } from './types'

export interface HandlerRequest {
  query: string
  type: ContentType
  metadata?: Record<string, any>
}

export interface HandlerContext {
  templateId: string
  language: string
  redis?: Redis
  monitoring?: SearchMonitoring
}

export abstract class BaseHandler {
  protected context: HandlerContext
  public config: HandlerConfig

  constructor(context: HandlerContext, config: HandlerConfig) {
    this.context = context
    this.config = config
  }

  abstract canHandle(request: HandlerRequest): Promise<boolean>
  abstract handle(request: HandlerRequest): Promise<StructuredResponse>
} 