import OpenAI from 'openai'
import { ContentTypeRegistry, ExtendedDetectionResult, BaseContentType, BaseContentTypes } from '@/lib/types/contentTypes'

interface OpenAIConfig {
  apiKey: string
  registry: ContentTypeRegistry
}

export class OpenAIService {
  private client: OpenAI
  private registry: ContentTypeRegistry

  constructor(config: OpenAIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey
    })
    this.registry = config.registry
  }

  public async analyzeContent(content: string): Promise<ExtendedDetectionResult> {
    try {
      console.log('Starte intelligente Content-Analyse...');

      const prompt = `Analysiere den folgenden Content und identifiziere die geschäftliche Domäne und thematischen Zusammenhänge.
      
      Fokussiere dabei auf:
      1. Geschäftsbereich/Domäne (z.B. Gesundheit, Versicherung, Finanzen)
      2. Spezifischen Teilbereich (z.B. Impfungen, Zahnversicherung, Altersvorsorge)
      3. Art der Information (z.B. Produktbeschreibung, Anleitung, Kontaktinformation)
      4. Zielgruppe und Kontext
      5. Verbindungen zu anderen möglichen Themen
      
      Wichtig: Identifiziere übergeordnete Kategorien statt spezifischer Einzelthemen.
      
      Content:
      ${content.slice(0, 2000)}

      Antworte im folgenden JSON-Format:
      {
        "domain": {
          "main": "Hauptgeschäftsbereich",
          "sub": "Spezifischer Teilbereich",
          "confidence": "Konfidenz zwischen 0 und 1"
        },
        "classification": {
          "type": "Informationstyp",
          "purpose": "Zweck des Inhalts",
          "audience": "Zielgruppe"
        },
        "relationships": {
          "parentTopic": "Übergeordnetes Thema",
          "relatedTopics": ["Verwandte", "Themen"],
          "possibleMergeTargets": ["Ähnliche", "Themenbereiche"]
        },
        "metadata": {
          "keywords": ["Wichtige", "Schlüsselwörter"],
          "requirements": ["Voraussetzungen"],
          "provider": "Anbieter der Leistung",
          "coverage": ["Leistungsumfang"],
          "nextSteps": ["Nächste", "Schritte"],
          "contactPoints": [
            {
              "type": "Art des Kontakts",
              "value": "Kontaktdaten",
              "description": "Beschreibung"
            }
          ]
        }
      }`;

      const completion = await this.client.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('Keine Antwort vom Modell erhalten');
      }

      console.log('Intelligente Analyse abgeschlossen');
      const result = JSON.parse(response);

      // Normalisiere und validiere das Ergebnis
      const contentType = this.determineContentType(result)
      return {
        type: contentType,
        confidence: result.domain.confidence,
        patterns: [
          {
            pattern: result.domain.main,
            matches: [result.domain.sub]
          }
        ],
        weight: 1.0,
        metadata: {
          domain: result.domain.main,
          subDomain: result.domain.sub,
          classification: result.classification,
          relationships: result.relationships,
          ...result.metadata,
          aiModel: "gpt-4-turbo-preview",
          timestamp: new Date().toISOString(),
          detectionMethod: 'intelligent_classification'
        },
        suggestedMetadata: {
          domain: result.domain.main,
          subDomain: result.domain.sub,
          classification: result.classification,
          keywords: result.metadata.keywords,
          requirements: result.metadata.requirements,
          provider: result.metadata.provider,
          coverage: result.metadata.coverage
        }
      };

    } catch (error) {
      console.error('Fehler bei der intelligenten Analyse:', error);
      return {
        type: BaseContentTypes.DEFAULT,
        confidence: 0,
        patterns: [],
        weight: 0,
        metadata: {
          domain: 'unknown',
          subDomain: 'unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          detectionMethod: 'fallback'
        },
        suggestedMetadata: {
          domain: 'unknown',
          subDomain: 'unknown',
          classification: {
            type: 'unknown',
            purpose: 'fallback',
            audience: 'general'
          }
        }
      };
    }
  }

  private determineContentType(result: any): BaseContentType {
    // Kombiniere Domain und Classification für einen präzisen Content-Type
    const domain = result.domain.main.toLowerCase();
    const type = result.classification.type.toLowerCase();
    
    // Mappe den kombinierten Typ auf einen gültigen BaseContentType
    switch (domain) {
      case 'health':
      case 'medical':
      case 'healthcare':
        return BaseContentTypes.SERVICE;
      case 'insurance':
        return BaseContentTypes.SERVICE;
      case 'finance':
      case 'financial':
        return BaseContentTypes.SERVICE;
      case 'education':
      case 'learning':
        return BaseContentTypes.ARTICLE;
      case 'contact':
      case 'support':
        return BaseContentTypes.CONTACT;
      case 'faq':
      case 'help':
        return BaseContentTypes.FAQ;
      case 'download':
      case 'document':
        return BaseContentTypes.DOWNLOAD;
      case 'video':
      case 'media':
        return BaseContentTypes.VIDEO;
      case 'image':
      case 'picture':
        return BaseContentTypes.IMAGE;
      default:
        return BaseContentTypes.DEFAULT;
    }
  }
} 