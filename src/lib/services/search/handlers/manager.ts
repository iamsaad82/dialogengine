import { BaseHandler } from './base'
import { HandlerConfig, HandlerContext, HandlerResponse } from './types'
import { AOKHandler } from './specialized/aok'
import { Redis } from 'ioredis'

export class HandlerManager {
  private handler: BaseHandler
  private readonly config: HandlerConfig
  private readonly redis?: Redis

  constructor(config: HandlerConfig) {
    this.config = config
    this.redis = config.redisUrl ? new Redis(config.redisUrl) : undefined
    this.handler = new AOKHandler(this.config)
    
    console.log('HandlerManager initialized with AOK handler')
  }

  public async findHandler(context: HandlerContext): Promise<BaseHandler | null> {
    console.log('HandlerManager - Processing request with AOK handler')
    
    const canHandle = await this.handler.canHandle(context)
    if (canHandle) {
      return this.handler
    }
    
    return null
  }

  public async processRequest(context: HandlerContext): Promise<HandlerResponse> {
    const handler = await this.findHandler(context)
    
    if (!handler) {
      throw new Error('No handler found for request')
    }
    
    return handler.handle(context)
  }
}