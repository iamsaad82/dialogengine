import { BaseHandler } from '../base'
import { HandlerConfig, HandlerContext, HandlerResponse } from '../types'
import { PineconeService } from '@/lib/services/pinecone/PineconeService'
import { OpenAI } from 'openai'
import { ContentTypeEnum } from '@/lib/types/contentTypes'
import { DocumentMetadata } from '@/lib/types/pinecone'
import { Redis } from 'ioredis'

interface PineconeQueryMatch {
  id: string
  score: number
  metadata: DocumentMetadata
}

interface CacheEntry {
  response: HandlerResponse
  timestamp: number
  vectorResults?: {
    sources: PineconeQueryMatch[]
    relevantContent: string
  }
  category?: string
}

interface VectorSearchResult {
  sources: PineconeQueryMatch[]
  relevantContent: string
}

interface MediaLink {
  url: string;
  type: 'image' | 'video' | 'pdf';
  description: string;
}

interface Action {
  type: 'button' | 'link'
  text: string
  action: string
  url?: string
}

interface InteractiveElements {
  suggestedQuestions: string[];
  actions: Action[];
  contact: string;
}

interface RelatedTopics {
  topics: string[];
  suggestedQuestions: string[];
  interactiveElements: InteractiveElements;
}

interface DocumentLink {
  url: string;
  title?: string;
  domain?: string;
  context?: string;
  trust?: number;
}

interface AOKHandlerConfig extends HandlerConfig {
  redisUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  pineconeApiKey: string;
  pineconeEnvironment: string;
  pineconeIndex: string;
  openaiApiKey: string;
}

interface AOKHandlerInternalConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

export class AOKHandler extends BaseHandler {
  private pinecone: PineconeService
  private openai: OpenAI
  private redis: Redis | null = null
  private internalConfig: AOKHandlerInternalConfig
  
  private readonly CACHE_TTL = {
    response: 3600,    // 1 Stunde für vollständige Antworten
    vector: 86400,     // 24 Stunden für Vektorsuchen
    category: 604800   // 1 Woche für Kategorien
  };

  private readonly CACHE_PREFIX = {
    response: 'aok:response:',
    vector: 'aok:vector:',
    category: 'aok:category:'
  };

  constructor(config: AOKHandlerConfig) {
    super(config)
    
    if (config.redisUrl) {
      this.redis = new Redis(config.redisUrl)
    }

    if (!config.pineconeApiKey || !config.pineconeEnvironment || !config.pineconeIndex) {
      throw new Error('Pinecone configuration missing')
    }

    this.pinecone = new PineconeService({
      apiKey: config.pineconeApiKey,
      indexName: config.pineconeIndex,
      openAIApiKey: config.openaiApiKey
    })

    this.openai = new OpenAI({ apiKey: config.openaiApiKey })
    
    this.internalConfig = {
      model: config.model || 'gpt-3.5-turbo',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 500
    }
  }

  private normalizeQuery(query: string): string {
    return query.toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[?!.,]/g, '')
  }

  private async getCachedResponse(query: string): Promise<CacheEntry | null> {
    if (!this.redis) return null
    
    const normalizedQuery = this.normalizeQuery(query)
    const cacheKey = `${this.CACHE_PREFIX.response}${normalizedQuery}`
    
    try {
        // Multi-Get für alle Cache-Ebenen
        const [fullCache, vectorCache, categoryCache] = await Promise.all([
            this.redis.get(cacheKey),
            this.redis.get(`${this.CACHE_PREFIX.vector}${normalizedQuery}`),
            this.redis.get(`${this.CACHE_PREFIX.category}${normalizedQuery}`)
        ])

        if (fullCache) {
            console.log('AOKHandler - Full cache hit')
            return JSON.parse(fullCache)
        }

        // Teilweise Cache-Wiederherstellung
        if (vectorCache || categoryCache) {
            console.log('AOKHandler - Partial cache hit')
            return {
                response: {
                    type: ContentTypeEnum.AOK_SERVICE,
                    text: '',
                    answer: '',
                    confidence: 0,
                    metadata: {
                        category: categoryCache || 'GENERAL',
                        source: 'AOK Knowledge Base',
                        processingTimes: {
                            vectorSearch: 0,
                            categoryAnalysis: 0,
                            responseGeneration: 0,
                            total: 0
                        }
                    }
                },
                vectorResults: vectorCache ? JSON.parse(vectorCache) : undefined,
                category: categoryCache || undefined,
                timestamp: Date.now()
            }
        }
    } catch (error) {
        console.error('Cache error:', error)
    }
    
    return null
  }

  private async setCachedResponse(query: string, entry: CacheEntry): Promise<void> {
    if (!this.redis) return
    
    const normalizedQuery = this.normalizeQuery(query)
    const pipeline = this.redis.pipeline()

    // Speichere verschiedene Cache-Ebenen
    pipeline.set(
        `${this.CACHE_PREFIX.response}${normalizedQuery}`,
        JSON.stringify(entry),
        'EX',
        this.CACHE_TTL.response
    )

    if (entry.vectorResults) {
        pipeline.set(
            `${this.CACHE_PREFIX.vector}${normalizedQuery}`,
            JSON.stringify(entry.vectorResults),
            'EX',
            this.CACHE_TTL.vector
        )
    }

    if (entry.category) {
        pipeline.set(
            `${this.CACHE_PREFIX.category}${normalizedQuery}`,
            entry.category,
            'EX',
            this.CACHE_TTL.category
        )
    }

    try {
        await pipeline.exec()
    } catch (error) {
        console.error('Cache pipeline error:', error)
    }
  }

  private async getCachedVectorResults(query: string): Promise<VectorSearchResult | null> {
    if (!this.redis) return null
    
    const cacheKey = `${this.CACHE_PREFIX.vector}${this.normalizeQuery(query)}`
    const cached = await this.redis.get(cacheKey)
    
    if (cached) {
      return JSON.parse(cached)
    }
    return null
  }

  private async setCachedVectorResults(query: string, results: VectorSearchResult): Promise<void> {
    if (!this.redis) return
    
    const cacheKey = `${this.CACHE_PREFIX.vector}${this.normalizeQuery(query)}`
    await this.redis.set(
      cacheKey,
      JSON.stringify(results),
      'EX',
      this.CACHE_TTL.vector
    )
  }

  private async getCachedCategory(query: string): Promise<string | null> {
    if (!this.redis) return null
    
    const cacheKey = `${this.CACHE_PREFIX.category}${this.normalizeQuery(query)}`
    return await this.redis.get(cacheKey)
  }

  private async setCachedCategory(query: string, category: string): Promise<void> {
    if (!this.redis) return
    
    const cacheKey = `${this.CACHE_PREFIX.category}${this.normalizeQuery(query)}`
    await this.redis.set(
      cacheKey,
      category,
      'EX',
      this.CACHE_TTL.category
    )
  }

  async canHandle(context: HandlerContext): Promise<boolean> {
    return true // Der AOK-Handler kann alle Anfragen verarbeiten
  }

  async handle(context: HandlerContext): Promise<HandlerResponse> {
    console.log('AOKHandler - Processing request:', context)
    const startTime = performance.now()
    const cacheKey = this.normalizeQuery(context.query)

    try {
      // Schneller Cache-Check
      const cachedResponse = await this.getCachedResponse(context.query)
      if (cachedResponse) {
        console.log('AOKHandler - Cache hit')
        return cachedResponse.response
      }

      // Parallele Ausführung mit Promise.all und Race für Category
      const [vectorResults, category] = await Promise.all([
        // Vector Search mit Cache
        (async () => {
          const cachedVectors = await this.getCachedVectorResults(context.query)
          if (cachedVectors) {
            console.log('AOKHandler - Vector cache hit')
            return cachedVectors
          }
          return this.searchVectorDatabase(context)
        })(),
        
        // Category Analysis mit schnellem Regex-Check und Cache
        (async () => {
          const cachedCategory = await this.getCachedCategory(context.query)
          if (cachedCategory) {
            console.log('AOKHandler - Category cache hit')
            return cachedCategory
          }

          // Schneller Regex-Check vor API-Call
          const quickCategory = this.getQuickCategory(context.query)
          if (quickCategory) {
            console.log('AOKHandler - Quick category match')
            await this.setCachedCategory(context.query, quickCategory)
            return quickCategory
          }

          return this.analyzeContext(context)
        })()
      ])

      const vectorSearchTime = performance.now() - startTime
      const categoryAnalysisTime = performance.now() - startTime

      // Optimierte Antwortgenerierung
      const responseStartTime = performance.now()
      const response = await this.generateOptimizedResponse(context, vectorResults, category)
      const responseGenerationTime = performance.now() - responseStartTime

      const totalTime = performance.now() - startTime

      // Logging der Performance-Metriken
      console.log('AOKHandler - Verarbeitung abgeschlossen:', {
        processingTimes: {
          vectorSearch: Math.round(vectorSearchTime),
          categoryAnalysis: Math.round(categoryAnalysisTime),
          responseGeneration: Math.round(responseGenerationTime),
          total: Math.round(totalTime)
        }
      })

      // Cache-Speicherung im Hintergrund
      this.setCachedResponse(context.query, {
        response,
        timestamp: Date.now(),
        vectorResults,
        category
      }).catch(error => console.error('Cache error:', error))

      return response
    } catch (error) {
      console.error('AOKHandler - Error:', error)
      throw error
    }
  }

  private getQuickCategory(query: string): string | null {
    // Schnelle Kategorie-Erkennung durch Regex
    const patterns = {
      MEDICAL: /\b(arzt|behandlung|therapie|medizin|krankheit|symptom)\b/i,
      PREVENTION: /\b(vorsorge|impfung|checkup|früherkennung|prävention)\b/i,
      INSURANCE: /\b(versicherung|beitrag|tarif|leistung|kosten|erstattung)\b/i,
      FAMILY: /\b(familie|kind|schwangerschaft|eltern|baby)\b/i,
      DIGITAL: /\b(app|online|digital|elektronisch|e-mail)\b/i,
      EMERGENCY: /\b(notfall|unfall|notruf|erste hilfe)\b/i,
      SERVICE: /\b(service|beratung|kontakt|termin|anmeldung)\b/i
    }

    for (const [category, pattern] of Object.entries(patterns)) {
      if (pattern.test(query)) {
        return category
      }
    }
    return null
  }

  private async generateOptimizedResponse(
    context: HandlerContext,
    vectorResults: VectorSearchResult,
    category: string
  ) {
    // Extrahiere relevante Informationen aus den Vektorergebnissen
    const relevantInfo = vectorResults.sources
      .map(result => result.metadata?.content || '')
      .join('\n')

    // Generiere Vorschlagsfragen basierend auf dem Kontext
    const suggestedQuestions = await this.generateSuggestedQuestions(context.query, relevantInfo)
    
    // Generiere passende Aktionen basierend auf allen Kategorien
    const categories = category.split(', ').map(c => c.trim())
    const actions = this.generateCategoryActions(categories)
    
    // Bestimme Kontaktoptionen
    const contact = this.determineContactOption(category)

    // Hole die kategoriespezifischen Metadaten
    const categoryMetadata = this.getCategoryMetadata(category)

    // Generiere die optimierte Antwort
    const response = await this.openai.chat.completions.create({
      model: this.internalConfig.model,
      messages: [
        {
          role: 'system',
          content: `Du bist ein AOK-Assistent. Beantworte die Frage basierend auf den gegebenen Informationen.
          Strukturiere deine Antwort in diese Abschnitte:
          
          🎯 Kernaussage
          [Hauptinformation kurz und prägnant]
          
          📋 Leistungen
          [Relevante AOK-Leistungen als Aufzählung]
          
          💡 Gut zu wissen
          [Wichtige Zusatzinformationen als Aufzählung]`
        },
        {
          role: 'user',
          content: `Frage: ${context.query}\n\nKontext: ${relevantInfo}`
        }
      ],
      temperature: this.internalConfig.temperature,
      max_tokens: this.internalConfig.maxTokens
    })

    return this.formatResponse(
      response,
      category,
      {
        questions: suggestedQuestions,
        actions,
        contact
      },
      this.internalConfig.model,
      context
    )
  }

  private async generateSuggestedQuestions(query: string, context: string): Promise<string[]> {
    const response = await this.openai.chat.completions.create({
      model: this.internalConfig.model,
      messages: [
        {
          role: 'system',
          content: 'Generiere 3 verwandte Fragen basierend auf der ursprünglichen Frage und dem Kontext. Die Fragen sollten relevant und hilfreich sein.'
        },
        {
          role: 'user',
          content: `Ursprüngliche Frage: ${query}\n\nKontext: ${context}`
        }
      ],
      temperature: 0.7,
      max_tokens: 200
    })

    const content = response.choices[0].message?.content || ''
    return content
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0)
  }

  private generateCategoryActions(categories: string[]): Action[] {
    const actions: Action[] = []

    categories.forEach(category => {
      switch (category) {
        case 'MEDICAL':
          actions.push(
            {
              type: 'button',
              text: 'Arzttermin vereinbaren',
              action: 'SCHEDULE_APPOINTMENT',
              url: 'https://www.aok.de/pk/uni/inhalt/online-terminvereinbarung/'
            },
            {
              type: 'button',
              text: 'Zweitmeinung einholen',
              action: 'GET_SECOND_OPINION',
              url: 'https://www.aok.de/pk/uni/inhalt/aok-zweitmeinung/'
            }
          )
          break
        case 'PREVENTION':
          actions.push(
            {
              type: 'button',
              text: 'Vorsorgetermin buchen',
              action: 'BOOK_CHECKUP',
              url: 'https://www.aok.de/pk/uni/inhalt/vorsorge-und-frueherkennung/'
            },
            {
              type: 'button',
              text: 'Gesundheitskurs finden',
              action: 'FIND_HEALTH_COURSE',
              url: 'https://www.aok.de/pk/uni/inhalt/gesundheitskurse/'
            }
          )
          break
        case 'FAMILY':
          actions.push(
            {
              type: 'button',
              text: 'Familienberatung',
              action: 'FAMILY_CONSULTATION',
              url: 'https://www.aok.de/pk/uni/inhalt/familie-und-kinder/'
            },
            {
              type: 'button',
              text: 'Hebammensuche',
              action: 'FIND_MIDWIFE',
              url: 'https://www.aok.de/pk/uni/inhalt/hebammensuche/'
            }
          )
          break
        case 'SERVICE':
          actions.push(
            {
              type: 'button',
              text: 'Persönliche Beratung',
              action: 'PERSONAL_CONSULTATION',
              url: 'https://www.aok.de/pk/uni/inhalt/persoenliche-beratung/'
            },
            {
              type: 'button',
              text: 'Online-Services',
              action: 'ONLINE_SERVICES',
              url: 'https://www.aok.de/pk/uni/inhalt/online-geschaeftsstelle/'
            }
          )
          break
      }
    })

    return actions
  }

  private determineContactOption(category: string): string {
    const categoryContacts: Record<string, string> = {
      'MEDICAL': 'Sprechen Sie mit unserem medizinischen Beratungsteam',
      'PREVENTION': 'Lassen Sie sich zu Vorsorge und Prävention beraten',
      'FAMILY': 'Unsere Familienberater unterstützen Sie gerne',
      'SERVICE': 'Kontaktieren Sie unseren Kundenservice'
    }

    return categoryContacts[category] || 'Wir beraten Sie gerne persönlich'
  }

  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  private getOptimizedPrompt(query: string, content: string): string {
    return `Als AOK-Berater beantworte folgende Frage klar und übersichtlich:
${query}

Kontext:
${content}

Formatiere deine Antwort wie folgt:

🎯 Kernaussage
[Eine prägnante Antwort in max. 2 Sätzen]

📋 Leistungen
- [Aufzählung der wichtigsten Leistungen]
- [Jeder Punkt max. 1 Zeile]

💡 Gut zu wissen
- [2-3 wichtige Zusatzinformationen]
- [Besonderheiten oder Einschränkungen]`
  }

  private async extractInteractiveElements(sources: PineconeQueryMatch[]) {
    const elements = sources
      .slice(0, 2)
      .flatMap(source => {
        const extracted = this.extractMediaAndRelatedContent(source)
        return {
          topics: extracted.relatedTopics.topics || [],
          questions: extracted.relatedTopics.suggestedQuestions || [],
          media: extracted.links.media || [],
          internal: extracted.links.internal || [],
          external: extracted.links.external || []
        }
      })
      .reduce((acc, curr) => ({
        topics: [...new Set([...acc.topics, ...curr.topics])],
        questions: [...new Set([...acc.questions, ...curr.questions])],
        media: [...new Set([...acc.media, ...curr.media])],
        internal: [...new Set([...acc.internal, ...curr.internal])],
        external: [...new Set([...acc.external, ...curr.external])]
      }), { topics: [], questions: [], media: [], internal: [], external: [] })

    // Konvertiere die extrahierten Elemente in das erwartete Format
    return {
      questions: elements.questions,
      actions: [
        ...elements.internal.map(url => ({
          type: 'link' as const,
          text: 'Interne Information',
          url
        })),
        ...elements.external.map(url => ({
          type: 'link' as const,
          text: 'Externe Information',
          url
        })),
        ...elements.media.map(url => ({
          type: 'media' as const,
          text: 'Medien ansehen',
          url
        }))
      ],
      contact: elements.topics.includes('contact') ? 'Kontakt aufnehmen' : ''
    }
  }

  private getQueryWithContext(context: HandlerContext): string {
    if (!context.metadata?.history?.length) {
        // Extrahiere Schlüsselwörter aus der Query
        const keywords = context.query.toLowerCase()
            .split(' ')
            .filter(word => 
                word.length > 3 && 
                !['was', 'zum', 'the', 'hast', 'gibt', 'sind', 'haben', 'welche', 'diese', 'dieses', 'thema'].includes(word)
            )
            .join(' ')
        return keywords || context.query
    }

    // Hole die letzte Antwort aus der History
    const history = context.metadata.history
    const lastMessages = history.slice(-2)
    const lastQuestion = lastMessages.find(msg => msg.role === 'user')?.content || ''
    const lastAnswer = lastMessages.find(msg => msg.role === 'assistant')?.content || ''

    // Wenn die aktuelle Frage unspezifisch ist
    if (/das thema|dem thema|dieses thema|zum thema/i.test(context.query)) {
        console.log('AOKHandler - Enhancing query with context:', {
            originalQuery: context.query,
            lastQuestion,
            lastAnswer
        })
        
        // Extrahiere relevante Begriffe aus der letzten Frage/Antwort
        const keywords = lastQuestion.split(' ')
            .concat(lastAnswer.split(' '))
            .filter(word => 
                word.length > 3 && 
                !['was', 'zum', 'the', 'hast', 'gibt', 'sind', 'haben', 'welche', 'diese', 'dieses', 'thema'].includes(word.toLowerCase())
            )
            .slice(0, 5)
            .join(' ')
        
        return keywords || context.query
    }

    return context.query
  }

  private isMediaLink(link: unknown): link is MediaLink {
    return typeof link === 'object' && 
           link !== null &&
           'url' in link &&
           'type' in link &&
           typeof (link as MediaLink).url === 'string' &&
           typeof (link as MediaLink).type === 'string'
  }

  private isDocumentLink(link: unknown): link is DocumentLink {
    return typeof link === 'object' && 
           link !== null &&
           'url' in link &&
           typeof (link as DocumentLink).url === 'string'
  }

  private extractMediaAndRelatedContent(match: PineconeQueryMatch) {
    // Medien-Links extrahieren und validieren
    const rawMediaLinks = match.metadata?.links_media as unknown[] || []
    const mediaLinks: MediaLink[] = Array.isArray(rawMediaLinks) 
      ? rawMediaLinks.filter((link): link is MediaLink => this.isMediaLink(link))
      : []
    
    // PDF-Links extrahieren (falls vorhanden)
    const pdfUrls = mediaLinks
      .filter(link => link.type === 'pdf')
      .map(link => link.url)
    
    // Verwandte Themen extrahieren und validieren
    const rawRelatedTopics = match.metadata?.relatedTopics
    const relatedTopics: RelatedTopics = (
      rawRelatedTopics && 
      typeof rawRelatedTopics === 'object' &&
      'topics' in rawRelatedTopics &&
      'suggestedQuestions' in rawRelatedTopics &&
      'interactiveElements' in rawRelatedTopics &&
      Array.isArray((rawRelatedTopics as any).topics) &&
      Array.isArray((rawRelatedTopics as any).suggestedQuestions) &&
      typeof (rawRelatedTopics as any).interactiveElements === 'object'
    ) ? {
      topics: (rawRelatedTopics as any).topics || [],
      suggestedQuestions: (rawRelatedTopics as any).suggestedQuestions || [],
      interactiveElements: {
        suggestedQuestions: [],
        actions: [],
        contact: ''
      }
    } : {
      topics: [],
      suggestedQuestions: [],
      interactiveElements: {
        suggestedQuestions: [],
        actions: [],
        contact: ''
      }
    }
    
    // Links extrahieren und validieren
    const rawInternalLinks = match.metadata?.links_internal as unknown[] || []
    const rawExternalLinks = match.metadata?.links_external as unknown[] || []
    
    const internalLinks: DocumentLink[] = Array.isArray(rawInternalLinks) 
      ? rawInternalLinks.filter((link): link is DocumentLink => this.isDocumentLink(link))
      : []
    
    const externalLinks: DocumentLink[] = Array.isArray(rawExternalLinks)
      ? rawExternalLinks.filter((link): link is DocumentLink => this.isDocumentLink(link))
      : []
    
    // Formatiere die Sektionen
    const mediaUrls = mediaLinks.map(link => link.url)
    const internalUrls = internalLinks.map(link => link.url)
    const externalUrls = externalLinks.map(link => link.url)
    
    const mediaSection = mediaUrls.length > 0 
      ? `\nVerfügbare Medien:\n${mediaUrls.join('\n')}`
      : ''
    
    const pdfSection = pdfUrls.length > 0
      ? `\nVerfügbare PDFs:\n${pdfUrls.join('\n')}`
      : ''
    
    return {
      content: String(match.metadata?.content || match.metadata?.text || ''),
      mediaSection,
      pdfSection,
      relatedTopics,
      links: {
        internal: internalUrls,
        external: externalUrls,
        media: mediaUrls
      }
    }
  }

  private async searchVectorDatabase(context: HandlerContext) {
    const templateId = context.metadata?.templateId
    if (!templateId) {
      throw new Error('Template ID fehlt im Kontext')
    }

    const expectedIndex = `${this.internalConfig.model}-${templateId}`
    const enhancedQuery = this.getQueryWithContext(context)
    
    // Cache-Key basierend auf normalisierter Query
    const cacheKey = `vector:${this.normalizeQuery(enhancedQuery)}`
    
    // Prüfe Cache
    const cachedResults = await this.redis?.get(cacheKey)
    if (cachedResults) {
      return JSON.parse(cachedResults)
    }

    console.log('AOKHandler - Starting vector search:', {
      index: expectedIndex,
      templateId,
      namespace: 'default',
      originalQuery: context.query,
      enhancedQuery
    })

    // Generiere Embedding für die Query
    const vector = await this.generateEmbedding(enhancedQuery)

    // Führe Vektorsuche durch
    const results = await this.pinecone.query({
      vector,
      topK: 3,
      filter: { templateId },
      templateId
    })
    
    const matches = (results.matches || []) as PineconeQueryMatch[]
    
    // Validiere und verarbeite Ergebnisse
    const validMatches = matches.filter(match => match.metadata.templateId === templateId)
    const processedResults = {
      sources: validMatches,
      relevantContent: validMatches
        .map(match => this.extractMediaAndRelatedContent(match))
        .filter(Boolean)
        .map(extracted => extracted.content + extracted.mediaSection + extracted.pdfSection)
        .join('\n\n')
    }

    // Cache Ergebnisse für 5 Minuten
    if (this.redis) {
      await this.redis.set(cacheKey, JSON.stringify(processedResults), 'EX', 300)
    }

    return processedResults
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text
    })
    return response.data[0].embedding
  }

  private async analyzeContext(context: HandlerContext) {
    const prompt = `Kategorisiere kurz: ${context.query}
Kategorien: MEDICAL, PREVENTION, SERVICE, INSURANCE, FAMILY, DIGITAL, EMERGENCY
Antworte NUR mit der Kategorie.`

    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 10
    })

    const category = response.choices[0].message?.content?.trim() || 'GENERAL'
    
    console.log('AOKHandler - Category analysis:', {
      query: context.query,
      category,
      confidence: response.choices[0].finish_reason === 'stop' ? 1 : 0.7
    })

    return category
  }

  private isComplexQuery(query: string, context: string): boolean {
    // Optimierte Komplexitätsprüfung
    const complexityIndicators = [
      query.length > 100,  // Längere Queries sind komplex
      query.includes('vergleich'),
      query.includes('unterschied'),
      /warum|wieso|weshalb/.test(query),
      context.length > 1000,  // Sehr langer Kontext
      (query.match(/\?/g) || []).length > 1  // Multiple Fragen
    ];
    
    return complexityIndicators.filter(Boolean).length >= 2;
  }

  private formatHistory(history: Array<any>): string {
    if (!history || history.length === 0) return '';
    
    return history
      .slice(-3) // Nur die letzten 3 Nachrichten
      .map(msg => `${msg.role === 'user' ? 'Frage' : 'Antwort'}: ${msg.content}`)
      .join('\n');
  }

  private getCategoryIcon(category: string): string {
    // Erweiterte Kategorie-Icon-Zuordnung
    if (category.includes('MEDICAL')) return 'health'
    if (category.includes('PREVENTION')) return 'shield'
    if (category.includes('SERVICE')) return 'service'
    if (category.includes('INSURANCE')) return 'insurance'
    if (category.includes('FAMILY')) return 'heart'
    if (category.includes('DIGITAL')) return 'globe'
    if (category.includes('EMERGENCY')) return 'phone'
    return 'info'
  }

  private getCategoryMetadata(category: string): { keywords: string[], relatedTopics: string[] } {
    // Mapping für einzelne Kategorien
    const categoryMap: Record<string, { keywords: string[], relatedTopics: string[] }> = {
      'MEDICAL': {
        keywords: ['Ärztliche Versorgung', 'Medizinische Behandlung', 'Heilmittel & Hilfsmittel'],
        relatedTopics: ['Vorsorgeuntersuchungen', 'Ärztliche Zweitmeinung', 'Arzneimittel', 'Heilmittelversorgung']
      },
      'PREVENTION': {
        keywords: ['AOK-Vorsorge', 'Gesundheitskurse', 'Präventionsangebote'],
        relatedTopics: ['Vorsorge-Plus', 'Schutzimpfungen', 'Gesundheits-Check-up', 'AOK-Bonusprogramm']
      },
      'FAMILY': {
        keywords: ['AOK-Familienversicherung', 'Leistungen für Kinder', 'Schwangerschaft & Geburt'],
        relatedTopics: ['Mutter/Vater-Kind-Kuren', 'Haushaltshilfe', 'Kinderkrankengeld', 'Hebammenbetreuung']
      },
      'CARE': {
        keywords: ['AOK-Pflegeleistungen', 'Häusliche Pflege', 'Pflegeberatung'],
        relatedTopics: ['Pflegegeld', 'Pflegehilfsmittel', 'Pflegegrad', 'Entlastungsleistungen']
      },
      'SERVICE': {
        keywords: ['AOK-Beratung', 'Geschäftsstellen', 'Online-Services'],
        relatedTopics: ['Meine AOK', 'AOK-Formularcenter', 'AOK-Gesundheitsangebote', 'Kundenservice']
      },
      'INSURANCE': {
        keywords: ['AOK-Versicherung', 'Mitgliedschaft', 'Beiträge & Tarife'],
        relatedTopics: ['AOK-Wahltarife', 'Zusatzversicherungen', 'Familienversicherung', 'Auslandsschutz']
      }
    }

    // Kombiniere Kategorien, wenn mehrere übergeben werden
    const categories = category.split(', ')
    let combinedKeywords: string[] = []
    let combinedTopics: string[] = []

    categories.forEach(cat => {
      const categoryData = categoryMap[cat.trim()]
      if (categoryData) {
        combinedKeywords.push(...categoryData.keywords)
        combinedTopics.push(...categoryData.relatedTopics)
      }
    })

    // Entferne Duplikate und behalte die Reihenfolge bei
    combinedKeywords = Array.from(new Set(combinedKeywords))
    combinedTopics = Array.from(new Set(combinedTopics))

    // Wenn keine spezifischen Kategorien gefunden wurden, verwende Fallback
    if (combinedKeywords.length === 0) {
      return {
        keywords: ['AOK-Leistungen', 'Gesundheitsversorgung', 'Beratungsangebote'],
        relatedTopics: ['AOK-Gesundheitsvorsorge', 'AOK-Behandlungsangebote', 'AOK-Service']
      }
    }

    return {
      keywords: combinedKeywords,
      relatedTopics: combinedTopics
    }
  }

  private extractMainTitle(query: string, category: string): string {
    // Extrahiere aussagekräftigen Titel aus der Query
    const cleanQuery = query.toLowerCase()
      .replace(/^(welche|was|wie|wo|wann|wer|warum)\s/, '')
      .replace(/\?$/, '')
    
    // Mapping für spezielle Fälle
    const titleMap: Record<string, string> = {
      'leistungen': 'AOK-Leistungen',
      'vorsorge': 'Vorsorge & Prävention',
      'versicherung': 'Versicherungsschutz',
      'beratung': 'Beratung & Service',
      'antrag': 'Anträge & Formulare'
    }

    // Suche nach Schlüsselwörtern
    for (const [key, value] of Object.entries(titleMap)) {
      if (cleanQuery.includes(key)) {
        // Wenn "für" oder "bei" im Query, füge Kontext hinzu
        const contextMatch = cleanQuery.match(/(?:für|bei)\s+(\w+(?:\s+\w+)?)/i)
        if (contextMatch) {
          return `${value} für ${contextMatch[1]}`
        }
        return value
      }
    }

    // Fallback: Nutze erste Kategorie als Basis
    const primaryCategory = category.split(',')[0].trim()
    const categoryDisplayNames: Record<string, string> = {
      'MEDICAL': 'Medizinische Versorgung',
      'PREVENTION': 'Vorsorge & Prävention',
      'FAMILY': 'Familie & Kinder',
      'CARE': 'Pflege & Betreuung',
      'SERVICE': 'Service & Beratung',
      'INSURANCE': 'Versicherung & Tarife'
    }

    return categoryDisplayNames[primaryCategory] || 'AOK-Informationen'
  }

  private determineCategories(category: string): {
    primaryCategory: string,
    secondaryCategories: string[]
  } {
    const categories = category.split(',').map(c => c.trim())
    
    // Priorisierung der Kategorien
    const priorityOrder = [
      'FAMILY', 'MEDICAL', 'PREVENTION', 'CARE', 
      'INSURANCE', 'SERVICE', 'DIGITAL', 'EMERGENCY'
    ]

    // Sortiere Kategorien nach Priorität
    categories.sort((a, b) => {
      const indexA = priorityOrder.indexOf(a)
      const indexB = priorityOrder.indexOf(b)
      return indexA - indexB
    })

    return {
      primaryCategory: categories[0],
      secondaryCategories: categories.slice(1, 4) // Maximal 3 weitere Kategorien
    }
  }

  private formatResponse(
    response: any,
    category: string,
    interactiveElements: {
      questions: string[];
      actions: Action[];
      contact: string;
    },
    model: string,
    context: HandlerContext
  ) {
    const answerText = response.choices[0].message?.content || ''

    // Mapping für benutzerfreundliche Kategorienamen
    const categoryDisplayNames: Record<string, string> = {
      'MEDICAL': 'Medizinische Versorgung',
      'PREVENTION': 'Vorsorge & Prävention',
      'FAMILY': 'Familie & Kinder',
      'CARE': 'Pflege & Betreuung',
      'SERVICE': 'Service & Beratung',
      'INSURANCE': 'Versicherung & Tarife',
      'DIGITAL': 'Digitale Angebote',
      'EMERGENCY': 'Notfall & Akuthilfe'
    }

    // Extrahiere Haupt- und Nebenkategorien
    const { primaryCategory, secondaryCategories } = this.determineCategories(category)
    
    // Erstelle Untertitel aus sekundären Kategorien
    const subtitle = secondaryCategories
      .map(cat => categoryDisplayNames[cat])
      .filter(Boolean)
      .join(' & ')

    // Get category metadata
    const categoryMeta = this.getCategoryMetadata(category)

    const formattedResponse = {
      type: ContentTypeEnum.AOK_SERVICE,
      text: answerText,
      answer: answerText,
      confidence: 1.0,
      metadata: {
        handler: 'aok',
        type: category.toLowerCase(),
        category: category,
        source: 'AOK Knowledge Base',
        icon: this.getCategoryIcon(primaryCategory),
        title: categoryDisplayNames[primaryCategory] || 'AOK-Informationen',
        mainTitle: this.extractMainTitle(context.query, primaryCategory),
        subtitle: subtitle,
        primaryCategory,
        secondaryCategories,
        keywords: categoryMeta.keywords,
        relatedTopics: categoryMeta.relatedTopics,
        interactiveElements: {
          suggestedQuestions: interactiveElements.questions,
          actions: interactiveElements.actions.map(action => ({
            type: action.type,
            text: action.text,
            action: action.action,
            url: action.url
          })),
          contact: interactiveElements.contact
        }
      }
    }

    // Debug-Logging
    console.log('[AOKHandler] Formatierte Antwort:', {
      type: formattedResponse.type,
      text: formattedResponse.text.substring(0, 100) + '...',
      metadata: formattedResponse.metadata
    })

    return formattedResponse
  }
} 