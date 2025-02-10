import { BaseHandler, HandlerConfig, HandlerContext } from './base'
import { MedicalHandler } from './specialized/medical'
import { InsuranceHandler } from './specialized/insurance'
import { ServiceHandler } from './specialized/service'
import { StructuredResponse } from '../types'
import { Redis } from 'ioredis'

export class HandlerManager {
  private handlerFactories: Map<string, () => BaseHandler>;
  private initializedHandlers: Map<string, BaseHandler>;
  private readonly config: HandlerConfig;
  private readonly redis?: Redis;
  private lastUsedHandler?: BaseHandler;
  private lastContext?: HandlerContext;

  constructor(config: HandlerConfig) {
    this.config = config;
    this.handlerFactories = new Map();
    this.initializedHandlers = new Map();
    this.redis = config.redisUrl ? new Redis(config.redisUrl) : undefined;

    // Registriere Handler-Factories
    this.registerHandlerFactory('medical', () => new MedicalHandler(this.config));
    this.registerHandlerFactory('insurance', () => new InsuranceHandler(this.config));
    this.registerHandlerFactory('service', () => new ServiceHandler(this.config));
    
    console.log('HandlerManager initialized with handlers:', Array.from(this.handlerFactories.keys()));
  }

  private registerHandlerFactory(type: string, factory: () => BaseHandler): void {
    this.handlerFactories.set(type, factory);
  }

  private async getHandler(type: string): Promise<BaseHandler | null> {
    // Prüfe zuerst den Cache
    let handler = this.initializedHandlers.get(type);
    if (handler) {
      return handler;
    }

    // Erstelle neuen Handler
    const factory = this.handlerFactories.get(type);
    if (!factory) {
      return null;
    }

    handler = factory();
    this.initializedHandlers.set(type, handler);
    return handler;
  }

  private parseStructuredContent(content: string): {
    type?: string
    metadata?: any
  } {
    try {
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  private extractContextFromHistory(history: Array<{ role: string, content: string }>): {
    lastType?: string | undefined
    topics: string[]
    metadata: any
  } {
    const context = {
      lastType: undefined as string | undefined,
      topics: [] as string[],
      metadata: {}
    };

    // Durchlaufe History rückwärts
    for (let i = history.length - 1; i >= 0; i--) {
      const message = history[i];
      if (message.role === 'assistant') {
        try {
          const parsed = this.parseStructuredContent(message.content);
          
          // Setze den letzten Typ, wenn noch nicht gesetzt
          if (parsed.type && !context.lastType) {
            context.lastType = parsed.type;
          }
          
          // Sammle Topics
          if (parsed.metadata?.topic) {
            context.topics.push(parsed.metadata.topic);
          }
          if (parsed.metadata?.topics) {
            context.topics.push(...parsed.metadata.topics);
          }
          
          // Sammle weitere Metadaten
          if (parsed.metadata) {
            context.metadata = { 
              ...context.metadata,
              ...parsed.metadata,
              // Behalte spezielle Felder
              topics: context.topics
            };
          }
        } catch (error) {
          console.warn('Failed to parse message content:', error);
        }
      }
    }

    return context;
  }

  /**
   * Findet den passenden Handler für den Kontext
   */
  public async findHandler(context: HandlerContext): Promise<BaseHandler | null> {
    console.log('HandlerManager - Finding handler for:', context);
    
    // Extrahiere zusätzlichen Kontext aus der History
    const history = context.metadata?.history || [];
    const { lastType, topics, metadata } = this.extractContextFromHistory(history);

    // Erweitere den Kontext mit der History
    const enrichedContext = {
      ...context,
      metadata: {
        ...context.metadata,
        previousContext: this.lastContext,
        previousType: lastType,
        topics,
        ...metadata
      }
    };

    // Wenn es einen vorherigen Handler gibt, prüfe diesen zuerst
    if (this.lastUsedHandler && this.lastContext) {
      const canStillHandle = await this.lastUsedHandler.canHandle(enrichedContext);
      
      if (canStillHandle) {
        console.log('HandlerManager - Reusing previous handler:', {
          handler: this.lastUsedHandler.constructor.name,
          previousType: lastType,
          topics
        });
        return this.lastUsedHandler;
      }
    }

    // Prüfe alle Handler
    for (const type of this.handlerFactories.keys()) {
      const handler = await this.getHandler(type);
      if (!handler) continue;

      const startTime = performance.now();
      const canHandle = await handler.canHandle(enrichedContext);
      const duration = performance.now() - startTime;
      console.log(`HandlerManager - ${type} check took ${duration}ms`);

      if (canHandle) {
        // Speichere den erfolgreichen Handler und Kontext
        this.lastUsedHandler = handler;
        this.lastContext = enrichedContext;
        console.log(`HandlerManager - Found handler in ${performance.now() - startTime}ms:`, {
          handler: handler.constructor.name,
          previousType: lastType,
          topics
        });
        return handler;
      }
    }

    console.log('HandlerManager - No handler found');
    return null;
  }

  /**
   * Verarbeitet eine Anfrage mit dem passenden Handler
   */
  public async handleRequest(context: HandlerContext): Promise<StructuredResponse> {
    const handler = await this.findHandler(context);
    
    if (handler) {
      try {
        return await handler.handle({
          ...context,
          metadata: {
            ...context.metadata,
            previousContext: this.lastContext
          }
        });
      } catch (error) {
        console.error('Handler error:', error);
        return this.createFallbackResponse(context);
      }
    }
    
    return this.createFallbackResponse(context);
  }

  private createFallbackResponse(context: HandlerContext): StructuredResponse {
    return {
      type: 'info',
      text: 'Entschuldigung, ich konnte Ihre Anfrage nicht spezifisch beantworten. Können Sie Ihre Frage bitte umformulieren oder präzisieren?',
      metadata: {
        error: 'Kein passender Handler gefunden',
        query: context.query
      }
    };
  }
} 