import { OpenAI } from 'openai'
import { ProcessedDocument, DocumentLinks } from './types'
import { HandlerConfig, HandlerResponse, HandlerSettings, HandlerMetadata } from '../../types/template'
import { ContentType } from '../../types/contentTypes'
import { createHash } from 'crypto'
import { Worker } from 'worker_threads'

interface SuggestedResponse {
  type: string
  content: string
  context: string
}

interface ContentAnalysis {
  type: ContentType
  structure: {
    sections: string[]
    keyTopics: string[]
    entities: string[]
  }
  context: {
    domain: string
    purpose: string
    audience: string
  }
  suggestedResponses: SuggestedResponse[]
  links?: DocumentLinks
}

interface CacheEntry {
  timestamp: number
  data: HandlerConfig
}

// Type Guard für OpenAI Response
function isOpenAIResponse(response: unknown): response is OpenAI.Chat.Completions.ChatCompletion {
  return response !== null &&
         typeof response === 'object' &&
         'choices' in response &&
         Array.isArray((response as any).choices) && 
         (response as any).choices.length > 0 && 
         'message' in (response as any).choices[0] &&
         typeof (response as any).choices[0].message.content === 'string'
}

export class HandlerGenerator {
  private openai: OpenAI
  private configCache: Map<string, CacheEntry>
  private readonly CACHE_TTL = 1000 * 60 * 60 // 1 Stunde
  private readonly MAX_PARALLEL_TASKS = 3

  constructor(openaiApiKey: string) {
    this.openai = new OpenAI({ apiKey: openaiApiKey })
    this.configCache = new Map()
  }

  private getCacheKey(document: ProcessedDocument): string {
    const content = typeof document.content === 'string' 
      ? document.content 
      : JSON.stringify(document.content)
    return createHash('md5').update(content).digest('hex')
  }

  private isCacheValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.CACHE_TTL
  }

  async generateHandler(document: ProcessedDocument): Promise<HandlerConfig> {
    const cacheKey = this.getCacheKey(document)
    const cachedConfig = this.configCache.get(cacheKey)

    if (cachedConfig && this.isCacheValid(cachedConfig)) {
      console.log('[HandlerGenerator] Cache-Treffer für Handler-Konfiguration')
      return cachedConfig.data
    }

    console.log('[HandlerGenerator] Generiere neue Handler-Konfiguration')
    
    // Parallele Analyse der verschiedenen Aspekte
    const [analysis, facts, additionalFacts] = await Promise.all([
      this.analyzeContent(document),
      this.extractKeyFacts(document.content),
      this.extractAdditionalFacts(document.content)
    ])

    // Generiere Handler-Konfiguration
    const config = await this.generateConfig(analysis, document, facts, additionalFacts)
    
    // Cache aktualisieren
    this.configCache.set(cacheKey, {
      timestamp: Date.now(),
      data: config
    })

    return config
  }

  private async analyzeContent(document: ProcessedDocument): Promise<ContentAnalysis> {
    console.log('[HandlerGenerator] Starte Content-Analyse')
    const systemPrompt = `Du bist ein Experte für Dokumentenanalyse und Informationsextraktion.
Analysiere den Text und erstelle eine JSON-Zusammenfassung mit folgender Struktur:
{
  "type": "medical" | "city-administration" | "insurance" | "shopping-center" | "default",
  "structure": {
    "sections": ["Abschnitt 1", "Abschnitt 2"],
    "keyTopics": ["Thema 1", "Thema 2"],
    "entities": ["Entity 1", "Entity 2"]
  },
  "context": {
    "domain": "Fachbereich",
    "purpose": "Verwendungszweck",
    "audience": "Zielgruppe"
  },
  "suggestedResponses": [
    {
      "type": "standard",
      "content": "Antwortvorlage",
      "context": "Verwendungskontext"
    }
  ]
}`

    // Verwende nur die ersten 2000 Zeichen für die initiale Analyse
    const previewContent = document.content.substring(0, 2000)
    console.log(`[HandlerGenerator] Analysiere ${previewContent.length} Zeichen`)

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout bei der OpenAI-Anfrage')), 30000) // 30 Sekunden Timeout
      })

      const analysisPromise = this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analysiere den folgenden Text und gib das Ergebnis als JSON zurück:\n\n${previewContent}` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 500
      })

      const response = await Promise.race([analysisPromise, timeoutPromise])
      console.log('[HandlerGenerator] OpenAI-Antwort erhalten')

      if (isOpenAIResponse(response)) {
        const content = response.choices[0].message.content
        if (!content) {
          throw new Error('Keine Analyse-Ergebnisse von OpenAI erhalten')
        }
        try {
          const analysis = JSON.parse(content) as ContentAnalysis
          this.validateAnalysis(analysis)
          console.log('[HandlerGenerator] Analyse erfolgreich validiert')
          return analysis
        } catch (error) {
          console.error('[HandlerGenerator] Fehler beim Parsen der Analyse:', error)
          return this.getDefaultAnalysis()
        }
      } else {
        console.error('[HandlerGenerator] Ungültige OpenAI-Antwort')
        return this.getDefaultAnalysis()
      }
    } catch (error) {
      console.error('[HandlerGenerator] Fehler bei der Content-Analyse:', error)
      return this.getDefaultAnalysis()
    }
  }

  private getDefaultAnalysis(): ContentAnalysis {
    console.log('[HandlerGenerator] Verwende Standard-Analyse')
    return {
      type: 'default',
      structure: {
        sections: [],
        keyTopics: [],
        entities: []
      },
      context: {
        domain: 'Allgemein',
        purpose: 'Information',
        audience: 'Allgemein'
      },
      suggestedResponses: [
        {
          type: 'standard',
          content: 'Ich kann Ihnen dazu allgemeine Informationen geben.',
          context: 'Standardantwort'
        }
      ]
    }
  }

  private validateAnalysis(analysis: ContentAnalysis): void {
    // Validiere den Content-Type
    if (!['city-administration', 'medical', 'insurance', 'shopping-center', 'default'].includes(analysis.type)) {
      throw new Error(`Ungültiger Content-Type: ${analysis.type}`)
    }

    // Validiere die Struktur
    if (!analysis.structure?.sections || !Array.isArray(analysis.structure.sections)) {
      throw new Error('Ungültige oder fehlende Sections in der Struktur')
    }

    if (!analysis.structure?.keyTopics || !Array.isArray(analysis.structure.keyTopics)) {
      throw new Error('Ungültige oder fehlende KeyTopics in der Struktur')
    }

    if (!analysis.structure?.entities || !Array.isArray(analysis.structure.entities)) {
      throw new Error('Ungültige oder fehlende Entities in der Struktur')
    }

    // Validiere den Kontext
    if (!analysis.context?.domain || typeof analysis.context.domain !== 'string') {
      throw new Error('Ungültige oder fehlende Domain im Kontext')
    }

    if (!analysis.context?.purpose || typeof analysis.context.purpose !== 'string') {
      throw new Error('Ungültiger oder fehlender Purpose im Kontext')
    }

    if (!analysis.context?.audience || typeof analysis.context.audience !== 'string') {
      throw new Error('Ungültige oder fehlende Audience im Kontext')
    }

    // Validiere die vorgeschlagenen Antworten
    if (!analysis.suggestedResponses || !Array.isArray(analysis.suggestedResponses)) {
      throw new Error('Ungültige oder fehlende SuggestedResponses')
    }

    analysis.suggestedResponses.forEach((response, index) => {
      if (!['standard', 'detailed', 'summary'].includes(response.type)) {
        throw new Error(`Ungültiger Response-Type bei Index ${index}: ${response.type}`)
      }

      if (!response.content || typeof response.content !== 'string') {
        throw new Error(`Ungültiger oder fehlender Content bei Index ${index}`)
      }

      if (!response.context || typeof response.context !== 'string') {
        throw new Error(`Ungültiger oder fehlender Context bei Index ${index}`)
      }
    })
  }

  private async generateConfig(
    analysis: ContentAnalysis,
    document: ProcessedDocument,
    facts: string[],
    additionalFacts: string[]
  ): Promise<HandlerConfig> {
    // Basis-Handler-Konfiguration
    const config: HandlerConfig = {
      type: analysis.type,
      metadata: {
        keyTopics: analysis.structure.keyTopics,
        entities: analysis.structure.entities,
        facts,
        ...document.metadata.templateMetadata
      },
      responses: await this.generateResponses(analysis, document, facts, additionalFacts),
      settings: {
        matchThreshold: 0.7,
        contextWindow: 3,
        maxTokens: 150,
        dynamicResponses: true,
        includeLinks: true
      }
    }

    return this.enrichConfigWithTypeSpecifics(config, analysis.type)
  }

  private enrichConfigWithTypeSpecifics(
    config: HandlerConfig,
    type: ContentType
  ): HandlerConfig {
    const enrichedConfig = { ...config }

    switch (type) {
      case 'medical':
        enrichedConfig.settings = {
          ...enrichedConfig.settings,
          matchThreshold: 0.8,
          includeContact: true,
          includeSteps: true
        }
        break
      
      case 'insurance':
        enrichedConfig.settings = {
          ...enrichedConfig.settings,
          includePrice: true,
          includeAvailability: true
        }
        break
      
      case 'city-administration':
        enrichedConfig.settings = {
          ...enrichedConfig.settings,
          matchThreshold: 0.8,
          useExactMatches: true
        }
        break
    }

    return enrichedConfig
  }

  private async generateResponses(
    analysis: ContentAnalysis,
    document: ProcessedDocument,
    facts: string[],
    additionalFacts: string[]
  ): Promise<HandlerResponse[]> {
    const links = document.structuredData.metadata.links as DocumentLinks | undefined

    const responses: HandlerResponse[] = [
      {
        type: "dynamic",
        templates: await this.generateDynamicTemplates(analysis.type),
        facts,
        context: "Dynamische Antwort basierend auf extrahierten Fakten",
        links: links ? this.filterRelevantLinks(links, facts.join(' ')) : undefined
      },
      {
        type: "detailed",
        templates: await this.generateDetailedTemplates(analysis.type),
        facts,
        additionalFacts,
        context: "Detaillierte Antwort mit zusätzlichen Informationen",
        links: links ? this.filterRelevantLinks(links, facts.join(' ') + ' ' + additionalFacts.join(' ')) : undefined
      }
    ]

    return responses
  }

  private async generateDynamicTemplates(type: ContentType): Promise<string[]> {
    const baseTemplates = [
      "Basierend auf den verfügbaren Informationen: {{facts}}",
      "Hier sind die wichtigsten Fakten dazu: {{facts}}",
      "Lassen Sie mich Ihnen die relevanten Informationen geben: {{facts}}",
      "Nach meinen Informationen verhält es sich so: {{facts}}",
      "Dazu kann ich Ihnen Folgendes mitteilen: {{facts}}"
    ]

    // Typ-spezifische Templates
    switch (type) {
      case 'medical':
        return [
          ...baseTemplates,
          "Aus medizinischer Sicht ist Folgendes wichtig: {{facts}}",
          "Die medizinischen Fakten dazu sind: {{facts}}"
        ]
      
      case 'insurance':
        return [
          ...baseTemplates,
          "Ihre Versicherung deckt folgende Aspekte ab: {{facts}}",
          "Bezüglich Ihrer Versicherungsleistungen gilt: {{facts}}"
        ]
      
      default:
        return baseTemplates
    }
  }

  private async generateDetailedTemplates(type: ContentType): Promise<string[]> {
    const baseTemplates = [
      "Hier sind die detaillierten Informationen: {{facts}} Weitere wichtige Aspekte sind: {{additionalFacts}}",
      "Lassen Sie mich das ausführlich erklären: {{facts}} Zusätzlich sollten Sie wissen: {{additionalFacts}}",
      "Eine umfassende Antwort beinhaltet: {{facts}} Ergänzend ist zu erwähnen: {{additionalFacts}}"
    ]

    // Typ-spezifische Templates
    switch (type) {
      case 'medical':
        return [
          ...baseTemplates,
          "Die vollständige medizinische Information umfasst: {{facts}} Beachten Sie auch: {{additionalFacts}}",
          "Aus medizinischer Sicht ist zu beachten: {{facts}} Ergänzende Informationen: {{additionalFacts}}"
        ]
      
      case 'insurance':
        return [
          ...baseTemplates,
          "Die Versicherungsdetails im Einzelnen: {{facts}} Zusätzliche Leistungen: {{additionalFacts}}",
          "Ihr Versicherungsschutz umfasst: {{facts}} Weitere relevante Aspekte: {{additionalFacts}}"
        ]
      
      default:
        return baseTemplates
    }
  }

  private filterRelevantLinks(links: DocumentLinks, context: string): DocumentLinks {
    return {
      internal: this.filterLinksByRelevance(links.internal, context),
      external: this.filterLinksByRelevance(links.external, context),
      media: this.filterLinksByRelevance(links.media, context)
    }
  }

  private filterLinksByRelevance<T extends { url: string; title?: string; description?: string }>(
    links: T[],
    context: string
  ): T[] {
    const contextWords = new Set(
      context.toLowerCase()
        .split(/\W+/)
        .filter(word => word.length > 3)
    )

    return links
      .map(link => {
        const linkText = [
          link.title,
          link.description,
          link.url
        ].filter(Boolean).join(' ').toLowerCase()

        const relevance = linkText.split(/\W+/)
          .filter(word => word.length > 3)
          .reduce((count, word) => contextWords.has(word) ? count + 1 : count, 0)

        return { link, relevance }
      })
      .filter(({ relevance }) => relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .map(({ link }) => link)
  }

  private async extractKeyFacts(content: string): Promise<string[]> {
    // Reduziere die Chunk-Größe auf 4000 Zeichen (ca. 1000 Tokens)
    const chunks = this.splitContentIntoChunks(content, 4000);
    const allFacts: string[] = [];
    let retryCount = 0;
    const maxRetries = 3;

    for (const chunk of chunks) {
      const systemPrompt = `Extrahiere die 3-5 wichtigsten Fakten aus dem Text. 
      Formuliere sie als kurze, prägnante Aussagen.
      Fokussiere auf die wesentlichen Informationen.
      Maximale Länge pro Fakt: 100 Zeichen.`

      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: chunk }
          ],
          temperature: 0.3,
          max_tokens: 150 // Begrenzt die Antwortlänge
        });

        const facts = response.choices[0].message.content?.split('\n')
          .filter(fact => fact.trim().length > 0)
          .map(fact => fact.trim().replace(/^[•-]\s*/, ''))
          .filter(fact => fact.length <= 100) || []; // Filtere zu lange Fakten

        allFacts.push(...facts);
      } catch (error) {
        console.error('Fehler bei der Faktenextraktion:', error);
        retryCount++;
        
        if (retryCount <= maxRetries) {
          // Warte kurz vor dem nächsten Versuch
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          continue;
        }
        // Nach max. Versuchen überspringe diesen Chunk
        continue;
      }
    }

    // Entferne Duplikate und limitiere die Gesamtanzahl
    return [...new Set(allFacts)].slice(0, 10);
  }

  private splitContentIntoChunks(content: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    let currentChunk = '';
    
    // Teile nach Absätzen
    const paragraphs = content.split(/\n\n+/);
    
    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        // Wenn ein einzelner Paragraph zu groß ist, teile ihn nach Sätzen
        if (paragraph.length > maxChunkSize) {
          const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
          for (const sentence of sentences) {
            if (sentence.length > maxChunkSize) {
              // Teile sehr lange Sätze in kleinere Stücke
              for (let i = 0; i < sentence.length; i += maxChunkSize) {
                chunks.push(sentence.slice(i, i + maxChunkSize).trim());
              }
            } else {
              if (currentChunk.length + sentence.length > maxChunkSize) {
                chunks.push(currentChunk.trim());
                currentChunk = sentence;
              } else {
                currentChunk += (currentChunk ? ' ' : '') + sentence;
              }
            }
          }
        } else {
          currentChunk = paragraph;
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  private async extractAdditionalFacts(content: string): Promise<string[]> {
    // Verwende die gleiche Chunk-Logik wie bei extractKeyFacts
    const chunks = this.splitContentIntoChunks(content, 4000);
    const allFacts: string[] = [];
    
    for (const chunk of chunks) {
      const systemPrompt = `Extrahiere 2-3 ergänzende Details aus dem Text.
      Fokussiere auf spezifische Informationen.
      Maximale Länge pro Detail: 100 Zeichen.`;

      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: chunk }
          ],
          temperature: 0.3,
          max_tokens: 150
        });

        const facts = response.choices[0].message.content?.split('\n')
          .filter(fact => fact.trim().length > 0)
          .map(fact => fact.trim().replace(/^[•-]\s*/, ''))
          .filter(fact => fact.length <= 100) || [];

        allFacts.push(...facts);
      } catch (error) {
        console.error('Fehler bei der Extraktion zusätzlicher Fakten:', error);
        continue;
      }
    }

    // Limitiere die Anzahl der zusätzlichen Fakten
    return [...new Set(allFacts)].slice(0, 5);
  }
} 