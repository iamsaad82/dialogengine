/**
 * Core handler system for processing and routing requests
 * @status active
 * @lastModified 2024-02
 */

import { Redis } from 'ioredis'
import { SearchMonitoring } from '../monitoring/SearchMonitoring'
import { StructuredResponse, ContentType } from '../search/types'
import { HandlerConfig, HandlerType, DynamicHandlerConfig, DynamicHandlerMetadata } from './types'
import { WelcomeHandler } from './WelcomeHandler'
import { FAQHandler } from './FAQHandler'
import { HelpHandler } from './HelpHandler'
import { DynamicHandler } from './DynamicHandler'
import { PrismaClient } from '@prisma/client'
import { welcomeConfig } from './configs/welcomeConfig'
import { BaseHandler, HandlerContext, HandlerRequest } from './base'

const prisma = new PrismaClient()

/**
 * Central handler management system
 * @status active
 * @usage high
 * @dependencies DynamicHandler
 * @note Legacy handlers (Welcome, FAQ, Help) are scheduled for deprecation
 */
export class HandlerManager {
  private readonly context: HandlerContext
  private readonly monitoring: SearchMonitoring
  private readonly redis?: Redis
  private handlers: Map<string, BaseHandler> = new Map()

  constructor(config: {
    templateId: string
    language?: string
    redisUrl?: string
    monitoring?: SearchMonitoring
  }) {
    this.context = {
      templateId: config.templateId,
      language: config.language || 'de'
    }

    if (config.redisUrl) {
      this.context.redis = new Redis(config.redisUrl)
    }

    this.monitoring = config.monitoring || new SearchMonitoring(config.templateId)
    this.initializeHandlers()
  }

  private async initializeHandlers() {
    try {
      console.log('Starting handler initialization...')
      
      // Zuerst Standard-Handler registrieren
      this.registerDefaultHandlers()
      console.log('Default handlers registered:', Array.from(this.handlers.keys()))

      // Template-spezifische Handler laden
      const template = await prisma.template.findUnique({
        where: { id: this.context.templateId },
        select: { jsonBot: true }
      })

      if (template?.jsonBot) {
        const botConfig = JSON.parse(template.jsonBot)
        const templateHandlers = botConfig.handlers?.[this.context.templateId] || []
        
        console.log('Loading template handlers:', {
          templateId: this.context.templateId,
          handlersCount: templateHandlers.length,
          handlers: templateHandlers.map((h: { type: string }) => h.type)
        })

        // Template-Handler registrieren
        for (const handlerConfig of templateHandlers) {
          const handler = this.createDynamicHandler(handlerConfig)
          if (handler) {
            this.registerHandler(handler)
            console.log('Registered template handler:', {
              type: handlerConfig.type,
              active: handlerConfig.active,
              name: handler.constructor.name
            })
          }
        }
      }
      
      console.log('Final registered handlers:', {
        count: this.handlers.size,
        handlers: Array.from(this.handlers.keys()),
        types: Array.from(this.handlers.values()).map(h => h.config.type)
      })
      
      this.monitoring.recordSuccess('handler_initialization')
    } catch (error) {
      this.monitoring.recordError('handler_initialization', error)
      console.error('Fehler bei der Handler-Initialisierung:', error)
      
      // Bei Fehler trotzdem Standard-Handler registrieren
      this.registerDefaultHandlers()
      console.log('Registered default handlers after error:', Array.from(this.handlers.keys()))
    }
  }

  /**
   * @status deprecated
   * @replacement Use createDynamicHandler instead
   */
  private registerDefaultHandlers() {
    console.log('Registering default handlers...')
    
    // Alte Handler als deprecated markieren
    const welcomeHandler = new WelcomeHandler(this.context, {
      type: 'welcome',
      name: 'WelcomeHandler',
      active: false, // Deaktiviert
      priority: 100,
      responseType: 'info'
    })
    
    // Neue DynamicHandler registrieren
    const dynamicWelcomeHandler = new DynamicHandler(this.context, welcomeConfig)
    
    this.handlers.set('welcome', welcomeHandler) // Deprecated
    this.handlers.set('welcome_dynamic', dynamicWelcomeHandler) // Neu

    // FAQ Handler
    const faqConfig: HandlerConfig = {
      type: 'faq',
      name: 'FAQHandler',
      active: true,
      priority: 90,
      responseType: 'info',
      patterns: [
        'wie',
        'was',
        'wann',
        'wo',
        'warum',
        'wer',
        'welche'
      ]
    }
    this.registerHandler(new FAQHandler(this.context, faqConfig))
    console.log('Registered FAQHandler')

    // Help Handler
    const helpConfig: HandlerConfig = {
      type: 'help',
      name: 'HelpHandler',
      active: true,
      priority: 80,
      responseType: 'info',
      patterns: [
        'hilfe',
        'help',
        'unterstützung',
        'anleitung'
      ]
    }
    this.registerHandler(new HelpHandler(this.context, helpConfig))
    console.log('Registered HelpHandler')

    // Zeige registrierte Handler
    console.log('Default handlers registered:', Array.from(this.handlers.keys()))
  }

  /**
   * @status active
   * @usage high
   * Primary method for creating new handlers
   */
  private createDynamicHandler(config: {
    type: string
    active: boolean
    metadata?: Partial<DynamicHandlerMetadata>
    responses?: Array<any>
    settings?: Partial<{
      matchThreshold: number
      contextWindow: number
      maxTokens: number
      dynamicResponses: boolean
      includeLinks: boolean
      includeContact?: boolean
      includeSteps?: boolean
    }>
  }): BaseHandler | null {
    try {
      const dynamicConfig: DynamicHandlerConfig = {
        type: 'dynamic',
        name: `${config.type}Handler`,
        active: config.active,
        priority: 100,
        responseType: 'info',
        metadata: {
          keyTopics: config.metadata?.keyTopics || [],
          entities: config.metadata?.entities || [],
          facts: config.metadata?.facts || [],
          links: config.metadata?.links || { internal: [], external: [], media: [] },
          relatedTopics: config.metadata?.relatedTopics || {
            topics: [],
            suggestedQuestions: [],
            interactiveElements: []
          }
        },
        responses: config.responses || [],
        settings: {
          matchThreshold: config.settings?.matchThreshold || 0.7,
          contextWindow: config.settings?.contextWindow || 3,
          maxTokens: config.settings?.maxTokens || 1000,
          dynamicResponses: config.settings?.dynamicResponses ?? true,
          includeLinks: config.settings?.includeLinks ?? true,
          includeContact: config.settings?.includeContact,
          includeSteps: config.settings?.includeSteps
        }
      }
      
      return new DynamicHandler(this.context, dynamicConfig)
    } catch (error) {
      console.error('Fehler beim Erstellen des dynamischen Handlers:', error)
      return null
    }
  }

  private registerHandler(handler: BaseHandler) {
    const name = handler.constructor.name
    this.handlers.set(name, handler)
  }

  public async findHandler(request: HandlerRequest): Promise<BaseHandler | null> {
    console.log('Finding handler for request:', {
      query: request.query,
      type: request.type,
      availableHandlers: Array.from(this.handlers.keys())
    })

    // Sortiere Handler nach Priorität
    const sortedHandlers = Array.from(this.handlers.values())
      .sort((a, b) => (b.config.priority || 0) - (a.config.priority || 0))

    for (const handler of sortedHandlers) {
      try {
        console.log(`Checking handler: ${handler.constructor.name}`)
        const canHandle = await handler.canHandle(request)
        console.log(`Handler ${handler.constructor.name} canHandle:`, canHandle)
        
        if (canHandle) {
          this.monitoring.recordSuccess('handler_found')
          return handler
        }
      } catch (error) {
        console.error(`Error checking handler ${handler.constructor.name}:`, error)
        this.monitoring.recordError('handler_check', error)
      }
    }
    
    console.log('No handler found for request:', request.query)
    this.monitoring.recordSuccess('no_handler_found')
    return null
  }

  public async shutdown(): Promise<void> {
    if (this.context.redis) {
      await this.context.redis.quit()
    }
  }

  public async saveHandler(handler: BaseHandler): Promise<boolean> {
    if (!this.context.redis) return false

    try {
      const handlersKey = `handlers:${this.context.templateId}`
      const handlerConfig = JSON.stringify(handler.config)
      await this.context.redis.hset(handlersKey, handler.constructor.name, handlerConfig)
      
      // Handler auch lokal registrieren
      this.registerHandler(handler)
      
      this.monitoring.recordSuccess('handler_saved')
      return true
    } catch (error) {
      this.monitoring.recordError('handler_save', error)
      console.error('Fehler beim Speichern des Handlers:', error)
      return false
    }
  }

  public async getHandlers(): Promise<BaseHandler[]> {
    return Array.from(this.handlers.values())
  }
} 