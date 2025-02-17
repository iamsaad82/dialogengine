import { BaseHandler } from '../base'
import { HandlerContext, HandlerResponse } from '../types'
import { ContentType } from '@/lib/types/contentTypes'
import { OpenAI } from 'openai'
import { PineconeService } from '@/lib/services/pineconeService'
import { Redis } from 'ioredis'

interface SmartSearchConfig {
  openaiApiKey: string
  pineconeApiKey: string
  pineconeEnvironment: string
  pineconeIndex: string
  redisUrl?: string
  temperature?: number
  maxTokens?: number
  templateId: string
}

export class SmartSearchHandler extends BaseHandler {
  private openai: OpenAI
  private pinecone: PineconeService
  private redis?: Redis
  protected config: SmartSearchConfig

  constructor(config: SmartSearchConfig) {
    super({
      templateId: config.templateId
    })
    
    this.config = config
    this.openai = new OpenAI({ apiKey: config.openaiApiKey })
    this.pinecone = new PineconeService()
    
    if (config.redisUrl) {
      this.redis = new Redis(config.redisUrl)
    }
  }

  async canHandle(context: HandlerContext): Promise<boolean> {
    return true // Dieser Handler kann alle Anfragen verarbeiten
  }

  async handle(context: HandlerContext): Promise<HandlerResponse> {
    try {
      // Implementiere hier die Suchlogik
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Du bist ein hilfreicher Assistent.'
          },
          {
            role: 'user',
            content: context.query
          }
        ],
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 500
      })

      const answer = response.choices[0].message?.content || 'Keine Antwort gefunden.'

      return {
        type: 'info' as ContentType,
        text: answer,
        answer,
        confidence: 1.0,
        metadata: {
          handler: 'smart-search',
          category: 'general',
          source: 'OpenAI',
          topics: [],
          entities: []
        }
      }
    } catch (error) {
      console.error('Fehler im SmartSearchHandler:', error)
      throw error
    }
  }

  async shutdown(): Promise<void> {
    if (this.redis) {
      await this.redis.quit()
    }
  }
} 