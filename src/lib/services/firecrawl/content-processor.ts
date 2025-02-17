import { OpenAI } from 'openai'
import { ContentTypeDetector } from '../contentTypeDetector'
import { ContentType, ContentTypes } from '../../types/contentTypes'
import { ExtractOptions, ExtractResult, ServiceData, CrawlResult, ProcessedDocument } from './types'

export class ContentProcessor {
  private openai: OpenAI
  private detector: ContentTypeDetector

  constructor(openaiApiKey: string) {
    this.openai = new OpenAI({
      apiKey: openaiApiKey
    })
    this.detector = new ContentTypeDetector(this.openai)
  }

  async detectContentType(content: string): Promise<ContentType> {
    try {
      const result = await this.detector.detect({
        content,
        title: '',
        url: ''
      })
      
      // Konvertiere den Typ in einen ContentType
      switch (result.type) {
        case 'info': return ContentTypes.Info
        case 'warning': return ContentTypes.Warning
        case 'error': return ContentTypes.Error
        case 'success': return ContentTypes.Success
        default: return ContentTypes.Info
      }
    } catch (error) {
      console.error('Fehler bei der Content-Type-Erkennung:', error)
      return ContentTypes.Info
    }
  }

  async extractInformation(content: string, options: ExtractOptions = {}): Promise<ExtractResult> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'Extrahiere strukturierte Informationen aus dem folgenden Text und gib sie als JSON zurück. ' +
              'Das JSON sollte folgende Struktur haben:\n' +
              '{\n' +
              '  "title": "Der Haupttitel",\n' +
              '  "description": "Eine kurze Beschreibung",\n' +
              '  "services": [\n' +
              '    {\n' +
              '      "name": "Name des Services",\n' +
              '      "description": "Beschreibung des Services",\n' +
              '      "requirements": ["Voraussetzung 1", "Voraussetzung 2"],\n' +
              '      "contact": "Kontaktinformationen für diesen Service"\n' +
              '    }\n' +
              '  ],\n' +
              '  "contact_info": {\n' +
              '    "phone": "Telefonnummer",\n' +
              '    "email": "E-Mail-Adresse",\n' +
              '    "address": "Postanschrift"\n' +
              '  }\n' +
              '}'
          },
          {
            role: 'user',
            content: options.prompt ? `${options.prompt}\n\n${content}` : content
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })

      const response = completion.choices[0].message.content
      if (!response) {
        throw new Error('Keine Antwort von OpenAI erhalten')
      }

      const extractedData = JSON.parse(response) as ExtractResult
      return this.validateExtractedData(extractedData)
    } catch (error) {
      console.error('Fehler bei der Informationsextraktion:', error)
      throw error
    }
  }

  private validateExtractedData(data: any): ExtractResult {
    const result: ExtractResult = {
      title: data.title || '',
      description: data.description || '',
      services: [],
      contact_info: {}
    }

    if (Array.isArray(data.services)) {
      result.services = data.services.map((service: ServiceData) => ({
        name: service.name || '',
        description: service.description || '',
        requirements: service.requirements,
        contact: service.contact
      }))
    }

    if (data.contact_info) {
      result.contact_info = {
        phone: data.contact_info.phone,
        email: data.contact_info.email,
        address: data.contact_info.address
      }
    }

    return result
  }

  async processCrawlResult(result: CrawlResult): Promise<ProcessedDocument> {
    const contentType = await this.detectContentType(result.markdown)
    const extractedInfo = await this.extractInformation(result.markdown)

    // Erstelle Metadata basierend auf dem Content-Type
    let metadata = {
      title: extractedInfo.title,
      description: extractedInfo.description
    }

    if (contentType === ContentTypes.Info) {
      metadata = {
        title: extractedInfo.title,
        description: extractedInfo.description
      }
    } else if (contentType === ContentTypes.Success) {
      metadata = {
        title: extractedInfo.title,
        description: extractedInfo.description,
        buttonText: 'Mehr erfahren'
      }
    }

    return {
      type: contentType,
      confidence: 1.0,
      metadata
    }
  }
} 