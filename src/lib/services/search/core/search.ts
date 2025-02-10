import { OpenAI } from 'openai'
import { Pinecone } from '@pinecone-database/pinecone'
import { Redis } from 'ioredis'
import { Anthropic } from '@anthropic-ai/sdk'
import { 
  SearchConfig,
  SearchOptions,
  SearchContext,
  SearchResult,
  StructuredResponse,
  QueryAnalysis,
  ContentType
} from '../types'
import { ContentVectorizer } from './vectorizer'
import { QueryAnalyzer } from './analyzer'
import { ResponseGenerator } from './generator'
import { HandlerManager } from '../handlers/manager'

export class SmartSearch {
  private readonly config: SearchConfig;
  private _openai?: OpenAI;
  private _pinecone?: Pinecone;
  private _vectorizer?: ContentVectorizer;
  private _analyzer?: QueryAnalyzer;
  private _generator?: ResponseGenerator;
  private _handlerManager?: HandlerManager;
  private _redis?: Redis;

  constructor(config: SearchConfig) {
    this.config = config;
  }

  // Lazy-Loading Getter
  private get openai() {
    if (!this._openai) {
      this._openai = new OpenAI({ apiKey: this.config.openaiApiKey });
    }
    return this._openai;
  }

  private get pinecone() {
    if (!this._pinecone) {
      try {
        // Pinecone-Client mit korrekter Konfiguration
        this._pinecone = new Pinecone({
          apiKey: this.config.pineconeApiKey
        });

        // Prüfe die Verbindung
        const index = this._pinecone.index(this.config.pineconeIndex);
        console.log('Pinecone-Index initialisiert:', {
          index: this.config.pineconeIndex
        });

        // Prüfe Index-Status
        index.describeIndexStats().then(stats => {
          console.log('Index-Statistiken:', stats);
        }).catch(error => {
          console.error('Fehler beim Abrufen der Index-Statistiken:', error);
        });
      } catch (error) {
        console.error('Fehler bei der Pinecone-Initialisierung:', error);
        throw new Error(`Pinecone konnte nicht initialisiert werden: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      }
    }
    return this._pinecone;
  }

  private get vectorizer() {
    if (!this._vectorizer) {
      this._vectorizer = new ContentVectorizer({
        openai: this.openai,
        pinecone: this.pinecone,
        indexName: this.config.pineconeIndex
      });
    }
    return this._vectorizer;
  }

  private get analyzer() {
    if (!this._analyzer) {
      this._analyzer = new QueryAnalyzer({
        openai: this.openai,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens
      });
    }
    return this._analyzer;
  }

  private get generator() {
    if (!this._generator) {
      this._generator = new ResponseGenerator({
        openai: this.openai,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens
      });
    }
    return this._generator;
  }

  private get handlerManager() {
    if (!this._handlerManager) {
      this._handlerManager = new HandlerManager({
        templateId: this.config.templateId,
        language: this.config.language,
        redisUrl: this.config.redisUrl
      });
    }
    return this._handlerManager;
  }

  public async search(
    context: SearchContext,
    options?: SearchOptions
  ): Promise<StructuredResponse> {
    const startTime = performance.now();
    console.log('SmartSearch - Starting search:', { context });

    try {
      // Versuche zuerst einen spezialisierten Handler zu finden
      const handler = await this.handlerManager.findHandler({
        query: context.query,
        type: 'info',
        metadata: {
          history: context.history,
          previousContext: context.metadata?.previousContext || context.history?.[context.history.length - 2]
        }
      });

      if (handler) {
        const handlerResponse = await handler.handle({
          query: context.query,
          type: 'info',
          metadata: {
            history: context.history,
            previousContext: context.metadata?.previousContext || context.history?.[context.history.length - 2]
          }
        });
        
        const duration = performance.now() - startTime;
        console.log(`SmartSearch - Handler response time: ${duration}ms`);
        
        return handlerResponse;
      }

      // Fallback: Vektorsuche
      try {
        const analysis = await this.analyzer.analyzeQuery(context.query);
        const searchResults = await this.searchDocuments(context, analysis, options);
        
        const contentType = this.analyzer.determineResponseType(analysis.intent, searchResults);
        
        const response = await this.generator.generateResponse(
          context,
          searchResults,
          contentType,
          analysis
        );

        const duration = performance.now() - startTime;
        console.log(`SmartSearch - Full search time: ${duration}ms`);
        
        return response;
      } catch (searchError) {
        console.error('SmartSearch - Fallback error:', searchError);
        // Generiere eine Fallback-Antwort
        return {
          type: 'error',
          text: 'Entschuldigung, ich konnte keine passende Antwort in meiner Wissensbasis finden. Bitte formulieren Sie Ihre Frage anders oder wenden Sie sich an unseren Support.',
          metadata: {
            error: searchError instanceof Error ? searchError.message : 'Unbekannter Fehler',
            processingTime: performance.now() - startTime
          }
        };
      }
    } catch (error) {
      console.error('SmartSearch - Critical error:', error);
      return {
        type: 'error',
        text: 'Es ist ein technischer Fehler aufgetreten. Bitte versuchen Sie es später erneut.',
        metadata: {
          error: error instanceof Error ? error.message : 'Unbekannter Fehler',
          processingTime: performance.now() - startTime
        }
      };
    }
  }

  private async searchDocuments(
    context: SearchContext,
    analysis: QueryAnalysis,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    try {
      // Berücksichtige den Chat-Verlauf für den Kontext
      const contextQuery = this.buildContextQuery(context, analysis);

      // Erstelle einen Embedding-Vektor für die erweiterte Query
      const queryVector = await this.vectorizer.vectorizeQuery(contextQuery);

      // Erste Suche mit moderatem Schwellenwert
      const searchResults = await this.vectorizer.searchSimilar(queryVector, {
        topK: options?.maxResults ?? 10, // Erhöhe die Anzahl der Ergebnisse
        minScore: options?.minScore ?? 0.3, // Niedrigerer Schwellenwert für mehr Ergebnisse
        namespace: this.config.pineconeIndex
      });

      // Wenn keine Ergebnisse, versuche es mit noch niedrigerem Schwellenwert
      if (searchResults.length === 0) {
        console.log('Keine Ergebnisse gefunden, versuche es mit sehr niedrigem Schwellenwert');
        return await this.vectorizer.searchSimilar(queryVector, {
          topK: options?.maxResults ?? 5,
          minScore: 0.2,
          namespace: this.config.pineconeIndex
        });
      }

      // Verbesserte Ergebnis-Filterung und Ranking
      const rankedResults = searchResults.map(result => {
        let contextScore = 0;
        
        // Erhöhe Score wenn Themen übereinstimmen
        if (result.metadata?.type && analysis.topics.includes(result.metadata.type)) {
          contextScore += 0.2;
        }

        // Prüfe Übereinstimmung mit vorherigen Nachrichten
        const recentMessages = context.history?.slice(-3) || [];
        for (const msg of recentMessages) {
          if (result.content.toLowerCase().includes(msg.content.toLowerCase())) {
            contextScore += 0.15;
          }
        }

        return {
          ...result,
          score: result.score + contextScore
        };
      });

      // Sortiere nach kombiniertem Score und filtere niedrige Scores
      const filteredResults = rankedResults
        .sort((a, b) => b.score - a.score)
        .filter(r => r.score > 0.4)
        .slice(0, 5);

      console.log('Vektorsuche Ergebnisse:', {
        originalCount: searchResults.length,
        filteredCount: filteredResults.length,
        scores: filteredResults.map(r => r.score),
        topics: filteredResults.map(r => r.metadata?.type)
      });

      return filteredResults;
    } catch (error) {
      console.error('Fehler bei der Dokumentensuche:', error);
      throw error;
    }
  }

  private buildContextQuery(context: SearchContext, analysis: QueryAnalysis): string {
    const { query, history = [] } = context;
    
    try {
        // Extrahiere die letzten relevanten Nachrichten
        const recentMessages = history
            .slice(-3) // Betrachte die letzten 3 Nachrichten für Kontext
            .map(msg => {
                const content = msg.content;
                // Versuche JSON zu parsen, falls es ein Objekt ist
                if (typeof content === 'string') {
                    try {
                        const parsed = JSON.parse(content);
                        return typeof parsed === 'object' && parsed !== null ? 
                               parsed.text || content : content;
                    } catch {
                        return content;
                    }
                }
                // Falls content ein Objekt ist
                return typeof content === 'object' && content !== null ? 
                       (content as any).text || String(content) : String(content);
            })
            .filter(Boolean)
            .join(' ');

        // Sichere Verarbeitung der Analyse-Ergebnisse
        const topics = Array.isArray(analysis.topics) ? analysis.topics.join(' ') : '';
        const requirements = Array.isArray(analysis.requirements) ? analysis.requirements.join(' ') : '';
        const timeframe = analysis.timeframe || '';

        // Baue erweiterte Suchanfrage
        const contextParts = [
            query,                          // Aktuelle Frage
            recentMessages,                // Vorherige Nachrichten
            topics && `Themen: ${topics}`, // Erkannte Themen
            requirements,                  // Identifizierte Anforderungen
            timeframe                     // Zeitlicher Kontext
        ].filter(Boolean);

        const enhancedQuery = contextParts.join(' ');

        console.log('Erweiterte Suchanfrage:', {
            originalQuery: query,
            recentMessages,
            topics,
            requirements,
            timeframe,
            enhancedQuery
        });

        return enhancedQuery;
    } catch (error) {
        console.error('Fehler bei der Kontextverarbeitung:', error);
        // Fallback: Verwende nur die aktuelle Frage
        return query;
    }
  }

  public async handleFeedback(feedback: string, sessionId: string): Promise<void> {
    if (!this._redis) return

    try {
      await this._redis.lpush(
        `feedback:${this.config.templateId}:${sessionId}`,
        JSON.stringify({
          feedback,
          timestamp: new Date().toISOString()
        })
      )
    } catch (error) {
      console.error('Fehler beim Speichern des Feedbacks:', error)
    }
  }

  // Neue Methode für direkte Suche
  public async searchRaw(query: string): Promise<any> {
    const pinecone = this.pinecone;
    const index = pinecone.index(this.config.pineconeIndex);
    
    // Vektorisiere die Anfrage
    const vector = await this.vectorizer.vectorize(query);
    
    // Führe die Suche durch
    const results = await index.query({
      vector,
      topK: 5,
      includeMetadata: true
    });
    
    return {
      query,
      vector,
      results
    };
  }
} 