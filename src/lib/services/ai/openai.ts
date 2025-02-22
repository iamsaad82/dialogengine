import { OpenAI } from 'openai'
import { Logger } from '@/lib/utils/logger'
import { ContentMetadata } from '@/lib/types/upload/analysis'
import { ContentTypeRegistryService } from '../registry/content-type-registry'

interface OpenAIConfig {
  apiKey: string
  registry: ContentTypeRegistryService
}

interface AnalysisResult {
  type: string
  confidence: number
  metadata: ContentMetadata
}

interface Pattern {
  title: string
  description: string
  regex: string
  confidence: number
}

interface Field {
  name: string
  type: string
  required: boolean
  description: string
  value?: string
}

interface Section {
  title: string
  content: string
}

export class OpenAIService {
  private client: OpenAI
  private registry: ContentTypeRegistryService
  private logger: Logger

  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey
    })
    this.registry = config.registry
    this.logger = new Logger('OpenAIService')
  }

  async analyzeContent(content: string): Promise<AnalysisResult> {
    try {
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `Du bist ein Experte für Inhaltsanalyse. Analysiere den folgenden Text und extrahiere die wichtigsten Informationen.
            WICHTIG: Alle Antworten MÜSSEN auf Deutsch sein, einschließlich aller Metadaten, Schlagworte und Beschreibungen.
            
            Gib das Ergebnis als JSON-Objekt mit folgender Struktur zurück:
            {
              type: string (Art des Inhalts),
              confidence: number (0-1, wie sicher bist du),
              metadata: {
                domain: string (Hauptbereich, auf Deutsch),
                subDomain: string (Unterbereich, auf Deutsch),
                provider?: string (Anbieter),
                serviceType?: string (Art der Dienstleistung),
                requirements?: string[] (Voraussetzungen),
                coverage?: string[] (Leistungsumfang),
                nextSteps?: string[] (Nächste Schritte),
                relatedTopics?: string[] (Verwandte Themen),
                deadlines?: string[] (Fristen),
                contactPoints?: Array<{type: string, value: string, description?: string}>,
                media?: {
                  images?: Array<{url: string, alt?: string, caption?: string}>,
                  videos?: Array<{url: string, title?: string, description?: string}>,
                  files?: Array<{url: string, name: string, type: string}>,
                  links?: Array<{url: string, title?: string, type?: string}>
                },
                interactive?: {
                  forms?: Array<{id: string, type: string, fields: Array<{name: string, type: string, required: boolean}>}>,
                  buttons?: Array<{text: string, action?: string, type?: string}>,
                  calculators?: Array<{id: string, type: string, inputs: string[], outputs: string[]}>
                }
              }
            }`
          },
          {
            role: 'user',
            content
          }
        ],
        response_format: { type: 'json_object' }
      })

      const messageContent = completion.choices[0]?.message?.content
      if (!messageContent) {
        throw new Error('Keine Antwort von OpenAI erhalten')
      }

      const result = JSON.parse(messageContent)
      return result as AnalysisResult
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
      this.logger.error('Fehler bei der OpenAI-Analyse:', new Error(errorMessage))
      throw error
    }
  }

  async detectSections(content: string): Promise<Section[]> {
    const prompt = `Analysiere den folgenden Content und identifiziere die wichtigsten Themenbereiche. 
WICHTIG: Alle Antworten MÜSSEN auf Deutsch sein.

Antworte ausschließlich mit einem validen JSON-Array, wobei jeder Eintrag ein Objekt mit title und content ist.

Content:
${content}

Format:
{
  "sections": [
    {
      "title": "Titel des Abschnitts",
      "content": "Inhalt des Abschnitts"
    }
  ]
}`

    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Du bist ein Experte für Content-Analyse und Strukturierung. Antworte ausschließlich mit einem validen JSON-Objekt. WICHTIG: Alle Antworten MÜSSEN auf Deutsch sein.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    try {
      const result = JSON.parse(response.choices[0].message.content || '{}')
      return result.sections || []
    } catch (error) {
      throw new Error('Ungültiges JSON-Format in der Antwort')
    }
  }

  async extractPatterns(content: string): Promise<Pattern[]> {
    const prompt = `Analysiere den folgenden Content und extrahiere wiederkehrende Muster. 
WICHTIG: Alle Antworten MÜSSEN auf Deutsch sein.

Antworte ausschließlich mit einem validen JSON-Objekt.

Content:
${content}

Format:
{
  "patterns": [
    {
      "title": "Name des Musters",
      "description": "Beschreibung des Musters",
      "regex": "Regulärer Ausdruck",
      "confidence": 0.95
    }
  ]
}`

    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Du bist ein Experte für Pattern Recognition und RegEx. Antworte ausschließlich mit einem validen JSON-Objekt. WICHTIG: Alle Antworten MÜSSEN auf Deutsch sein.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    try {
      const result = JSON.parse(response.choices[0].message.content || '{}')
      return result.patterns || []
    } catch (error) {
      throw new Error('Ungültiges JSON-Format in der Antwort')
    }
  }

  async extractFields(content: string): Promise<Field[]> {
    const prompt = `Analysiere den folgenden Content und extrahiere mögliche Metadaten-Felder. 
WICHTIG: Alle Antworten MÜSSEN auf Deutsch sein.

Antworte ausschließlich mit einem validen JSON-Objekt.

Content:
${content}

Format:
{
  "fields": [
    {
      "name": "Name des Feldes",
      "type": "Feldtyp",
      "required": true/false,
      "description": "Beschreibung des Feldes"
    }
  ]
}`

    const response = await this.client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Du bist ein Experte für Metadaten-Extraktion und Datenmodellierung. Antworte ausschließlich mit einem validen JSON-Objekt. WICHTIG: Alle Antworten MÜSSEN auf Deutsch sein.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    try {
      const result = JSON.parse(response.choices[0].message.content || '{}')
      return result.fields || []
    } catch (error) {
      throw new Error('Ungültiges JSON-Format in der Antwort')
    }
  }
} 