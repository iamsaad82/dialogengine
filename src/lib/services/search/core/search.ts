import { OpenAI } from 'openai'
import { Pinecone } from '@pinecone-database/pinecone'
import { Redis } from 'ioredis'
import { 
  SearchConfig,
  SearchOptions,
  SearchContext,
  SearchResult,
  StructuredResponse,
  QueryAnalysis
} from '../types'
import { ContentVectorizer } from './vectorizer'
import { QueryAnalyzer } from './analyzer'
import { ResponseGenerator } from './generator'
import { HandlerManager } from '../handlers/manager'
import { PineconeService } from '@/lib/services/pineconeService'
import { SearchMonitoring } from '../../monitoring/SearchMonitoring'
import { SearchCache } from '../../cache/SearchCache'
import { SearchHealth } from '../../health/SearchHealth'
import { DocumentMetadata } from '../types/document'

interface Cache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl: number): Promise<void>;
}

export class SmartSearch {
  private readonly templateId: string
  private readonly config: SearchConfig
  private readonly openai: OpenAI
  private readonly pineconeService: PineconeService
  private readonly monitoring: SearchMonitoring
  private readonly cache: SearchCache
  private readonly health: SearchHealth
  private readonly vectorizer: ContentVectorizer
  private readonly analyzer: QueryAnalyzer
  private readonly generator: ResponseGenerator
  private readonly handlerManager: HandlerManager
  private cache?: Cache

  constructor(
    templateId: string,
    config: SearchConfig,
    cache?: SearchCache
  ) {
    this.templateId = templateId
    this.config = config
    this.cache = cache

    // Basis-Services initialisieren
    this.openai = new OpenAI({ apiKey: config.openaiApiKey })
    this.pineconeService = new PineconeService()

    // Support-Services initialisieren
    this.monitoring = new SearchMonitoring(templateId)
    const redis = config.redis ? new Redis(config.redis) : undefined
    this.cache = new SearchCache(redis, this.monitoring)
    this.health = new SearchHealth({
      openai: this.openai,
      pinecone: this.pineconeService.getPinecone(),
      indexName: this.pineconeService.getTemplateIndexName(templateId),
      redis
    })

    // Core-Services initialisieren
    this.vectorizer = new ContentVectorizer({
      openai: this.openai,
      pinecone: this.pineconeService.getPinecone(),
      indexName: this.pineconeService.getTemplateIndexName(templateId)
    })

    this.analyzer = new QueryAnalyzer({
      openai: this.openai,
      temperature: config.temperature,
      maxTokens: config.maxTokens
    })

    this.generator = new ResponseGenerator(config.openaiApiKey)
    this.handlerManager = new HandlerManager()

    // Index-Existenz sicherstellen
    this.initializeIndex().catch(error => {
      console.error('Fehler bei der Index-Initialisierung:', error)
      this.monitoring.recordError('initialization', error)
    })
  }

  private async initializeIndex(): Promise<void> {
    await this.pineconeService.ensureIndexExists(this.templateId)
  }

  private generateCacheKey(context: SearchContext): string {
    const key = `search:${context.templateId}:${context.query}`
    if (context.history?.length) {
      const recentHistory = context.history
        .slice(-3)
        .map(msg => msg.content)
        .join('|')
      return `${key}:${Buffer.from(recentHistory).toString('base64')}`
    }
    return key
  }

  private async searchDocuments(
    query: string, 
    filter?: Record<string, any>
  ): Promise<SearchResult[]> {
    const cacheKey = `search:${query}:${JSON.stringify(filter || {})}`;
    
    try {
      // Cache-Check
      if (this.cache) {
        const cached = await this.cache.get(cacheKey);
        if (cached) {
          console.log('[SmartSearch] Cache-Treffer für:', query);
          return cached as SearchResult[];
        }
      }

      const embedding = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
        dimensions: 1536
      });

      const queryEmbedding = embedding.data[0].embedding;
      const results = await this.pineconeService.query(
        this.templateId,
        queryEmbedding,
        this.config.searchConfig?.maxResults || 5,
        filter
      );

      if (!results.matches || results.matches.length === 0) {
        console.log('[SmartSearch] Keine Ergebnisse gefunden für Query:', query);
        return [];
      }

      const searchResults = results.matches.map(match => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata as DocumentMetadata,
        content: (match.metadata as DocumentMetadata).content || '',
        type: (match.metadata as DocumentMetadata).type || 'text'
      }));

      // Cache-Speicherung
      if (this.cache) {
        await this.cache.set(cacheKey, searchResults);
      }

      return searchResults;
    } catch (error) {
      console.error('[SmartSearch] Fehler bei der Dokumentensuche:', error);
      throw error;
    }
  }

  private getRelatedQueries(query: string): string[] {
    // Generiere verwandte Queries für Batch-Processing
    const words = query.toLowerCase().split(' ');
    const related = [];
    
    if (words.length > 3) {
      related.push(words.slice(0, 3).join(' ')); // Erste 3 Wörter
      related.push(words.slice(-3).join(' ')); // Letzte 3 Wörter
    }
    
    return related;
  }

  public async search(
    context: SearchContext,
    options?: SearchOptions
  ): Promise<StructuredResponse> {
    const startTime = performance.now()
    this.monitoring.recordSearchStart()

    try {
      // Prüfe Index-Status
      const stats = await this.pineconeService.getIndexStats(this.templateId)
      console.log('[SmartSearch] Index Stats:', stats)

      if (stats.totalRecordCount === 0) {
        return {
          answer: 'Es tut mir leid, aber ich habe noch keine Informationen in meiner Datenbank. Bitte kontaktieren Sie den Support, damit die notwendigen Dokumente indexiert werden können.',
          confidence: 1.0,
          type: 'info'
        }
      }

      if (!this.health.canAcceptConnections()) {
        throw new Error('Service überlastet - Bitte versuchen Sie es später erneut')
      }

      // Cache prüfen
      const cacheKey = this.generateCacheKey(context)
      const cachedResponse = await this.cache.get(cacheKey)
      if (cachedResponse) {
        const duration = (performance.now() - startTime) / 1000
        this.monitoring.recordLatency(duration, 'cache')
        this.monitoring.recordSuccess('cache')
        return cachedResponse
      }

      // Handler-Suche
      const handler = await this.handlerManager.findHandler({
        query: context.query,
        type: 'info',
        metadata: {
          history: context.history,
          previousContext: context.metadata?.previousContext || context.history?.[context.history.length - 2]
        }
      })

      if (handler) {
        try {
          const handlerResponse = await handler.handle({
            query: context.query,
            type: 'info',
            metadata: {
              history: context.history,
              previousContext: context.metadata?.previousContext || context.history?.[context.history.length - 2]
            }
          })

          const duration = (performance.now() - startTime) / 1000
          this.monitoring.recordLatency(duration, 'handler')
          this.monitoring.recordSuccess('handler')
          this.monitoring.recordHandlerUsage(handler.constructor.name, 'success')

          await this.cache.set(cacheKey, handlerResponse)
          return handlerResponse
        } catch (error) {
          this.monitoring.recordHandlerUsage(handler.constructor.name, 'error')
          this.monitoring.recordError('handler', error)
          throw error
        }
      }

      // Vektorsuche
      try {
        const analysis = await this.analyzer.analyzeQuery(context.query)
        const searchResults = await this.searchDocuments(context.query, analysis.metadata)

        // Wenn keine Ergebnisse gefunden wurden
        if (searchResults.length === 0) {
          return {
            answer: 'Entschuldigung, aber ich konnte keine passenden Informationen zu Ihrer Anfrage finden. Können Sie Ihre Frage vielleicht anders formulieren oder spezifischer sein?',
            confidence: 1.0,
            type: 'info'
          }
        }

        const contentType = this.analyzer.determineResponseType(analysis.intent, searchResults)
        const response = await this.generator.generateResponse(
          context,
          searchResults,
          contentType,
          analysis
        )

        const duration = (performance.now() - startTime) / 1000
        this.monitoring.recordLatency(duration, 'vector')
        this.monitoring.recordSuccess('vector')

        await this.cache.set(cacheKey, response)
        return response
      } catch (error) {
        this.monitoring.recordError('vector_search', error)
        throw error
      }
    } catch (error) {
      this.monitoring.recordError('search', error)
      throw error
    } finally {
      this.monitoring.recordSearchEnd()
    }
  }

  public async shutdown(): Promise<void> {
    // Warte auf aktive Verbindungen
    while (this.monitoring.getActiveConnections() > 0) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
} 