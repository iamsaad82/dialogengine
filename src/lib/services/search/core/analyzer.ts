import { OpenAI } from 'openai'
import { QueryAnalysis, SearchResult, ContentType } from '../types'
import { ContentTypeEnum } from '@/lib/types/contentTypes'

interface AnalyzerConfig {
  openai: OpenAI
  temperature?: number
  maxTokens?: number
}

export class QueryAnalyzer {
  private readonly openai: OpenAI
  private readonly temperature: number
  private readonly maxTokens: number

  constructor(config: AnalyzerConfig) {
    this.openai = config.openai
    this.temperature = config.temperature ?? 0.7
    this.maxTokens = config.maxTokens ?? 500
  }

  public async analyzeQuery(query: string): Promise<QueryAnalysis> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Analysiere die Benutzeranfrage und extrahiere die folgenden Informationen:
            - intent: Die Absicht hinter der Anfrage (z.B. information_seeking, service_request, complaint)
            - topics: Relevante Themen und Schlüsselwörter
            - requirements: Spezifische Anforderungen oder Bedingungen
            - timeframe: Zeitlicher Rahmen (wenn angegeben)
            - expectedActions: Erwartete Aktionen oder nächste Schritte
            
            Formatiere die Antwort als JSON-Objekt mit diesen Feldern.`
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('Keine Antwort vom Analyzer erhalten')
      }

      return JSON.parse(content) as QueryAnalysis
    } catch (error) {
      console.error('Fehler bei der Analyse:', error)
      return {
        intent: 'unknown',
        topics: [],
        requirements: [],
        timeframe: 'unknown',
        expectedActions: []
      }
    }
  }

  public determineResponseType(intent: string, results: SearchResult[]): ContentType {
    // Mapping von Intents zu ContentTypes
    const typeMapping: Record<string, ContentType> = {
      'information': ContentTypeEnum.INFO,
      'medical': ContentTypeEnum.MEDICAL,
      'insurance': ContentTypeEnum.INSURANCE,
      'service': ContentTypeEnum.SERVICE,
      'process': ContentTypeEnum.PROCESS,
      'form': ContentTypeEnum.FORM,
      'faq': ContentTypeEnum.FAQ,
      'event': ContentTypeEnum.EVENT,
      'product': ContentTypeEnum.PRODUCT,
      'location': ContentTypeEnum.LOCATION
    }

    // Versuche zuerst, den Typ aus dem Intent abzuleiten
    const intentLower = intent.toLowerCase()
    for (const [key, value] of Object.entries(typeMapping)) {
      if (intentLower.includes(key)) {
        return value
      }
    }

    // Prüfe die Ergebnisse nach spezifischen Indikatoren
    for (const result of results) {
      if (result.metadata?.type) {
        return result.metadata.type as ContentType
      }
      
      const title = result.title.toLowerCase()
      const content = result.content?.toLowerCase() || ''

      if (title.includes('arzt') || content.includes('medizin')) return ContentTypeEnum.MEDICAL
      if (title.includes('versicherung')) return ContentTypeEnum.INSURANCE
      if (title.includes('service')) return ContentTypeEnum.SERVICE
      if (title.includes('formular')) return ContentTypeEnum.FORM
      if (title.includes('termin')) return ContentTypeEnum.EVENT
      if (title.includes('produkt')) return ContentTypeEnum.PRODUCT
      if (title.includes('standort')) return ContentTypeEnum.LOCATION
    }

    // Fallback auf INFO
    return ContentTypeEnum.INFO
  }

  private extractTopicsFromResults(results: SearchResult[]): string[] {
    const topics = new Set<string>()
    
    for (const result of results) {
      // Extrahiere Topics aus der URL-Struktur
      if (result.url) {
        const urlParts = new URL(result.url).pathname.split('/').filter(Boolean)
        if (urlParts.length > 0) {
          topics.add(urlParts[0])
        }
      }

      // Extrahiere Topics aus dem Titel
      if (result.title) {
        const words = result.title
          .toLowerCase()
          .split(/\s+/)
          .filter(word => word.length > 3)
        words.forEach(word => topics.add(word))
      }

      // Berücksichtige vorhandene Metadaten
      if (result.metadata?.tags) {
        result.metadata.tags.forEach(tag => topics.add(tag))
      }
    }

    return Array.from(topics)
  }
} 