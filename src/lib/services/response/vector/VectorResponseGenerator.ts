import { ContentType } from '../../../types/contentTypes'
import { PineconeMetadata, PineconeBaseMetadata } from '../../metadata/types/pinecone'
import { OpenAI } from 'openai'
import { Pinecone } from '@pinecone-database/pinecone'

interface VectorResponse {
  type: ContentType
  text: string
  confidence: number
  metadata?: Record<string, any>
}

interface VectorContext {
  query: string
  templateId: string
  previousResponses?: VectorResponse[]
}

interface SearchResult {
  id: string
  score: number
  metadata: PineconeMetadata
}

/**
 * Generator für vektorbasierte Antworten
 */
export class VectorResponseGenerator {
  private readonly openai: OpenAI
  private readonly pinecone: Pinecone
  private readonly namespace?: string
  private threshold: number
  private topK: number
  private defaultThreshold: number
  private defaultTopK: number

  constructor(
    private readonly config: {
      openaiApiKey: string
      pineconeApiKey: string
      pineconeEnvironment: string
      pineconeIndex: string
      namespace?: string
    }
  ) {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey })
    this.pinecone = new Pinecone({ apiKey: config.pineconeApiKey })
    this.namespace = config.namespace
    this.threshold = 0.5
    this.topK = 5
    this.defaultThreshold = 0.5
    this.defaultTopK = 5
  }

  /**
   * Generiert eine vektorbasierte Antwort
   */
  async generateResponse(context: VectorContext): Promise<VectorResponse> {
    try {
      // 1. Query vektorisieren
      const queryEmbedding = await this.vectorizeQuery(context.query)

      // 2. Ähnliche Dokumente finden
      const searchResults = await this.searchSimilarDocuments(
        queryEmbedding,
        context.templateId
      )

      // 3. Antwort generieren
      const response = await this.generateAnswerFromResults(
        context.query,
        searchResults,
        context
      )

      return {
        ...response,
        confidence: this.calculateConfidence(response, searchResults)
      }
    } catch (error) {
      console.error('Fehler bei der Vektor-Verarbeitung:', error)
      return this.getDefaultResponse(context)
    }
  }

  /**
   * Vektorisiert eine Query
   */
  private async vectorizeQuery(query: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query
    })

    return response.data[0].embedding
  }

  /**
   * Sucht ähnliche Dokumente in Pinecone
   */
  private async searchSimilarDocuments(
    queryVector: number[],
    templateId: string
  ): Promise<SearchResult[]> {
    const index = this.pinecone.index(this.config.pineconeIndex)

    const response = await index.query({
      vector: queryVector,
      topK: this.topK,
      filter: { templateId },
      includeMetadata: true
    })

    return response.matches
      .filter(match => match.score !== undefined && match.metadata)
      .map(match => ({
        id: match.id,
        score: match.score!,
        metadata: this.validateMetadata(match.metadata)
      }))
  }

  /**
   * Validiert und konvertiert die Metadaten
   */
  private validateMetadata(metadata: Record<string, any> | undefined): PineconeMetadata {
    if (!metadata) {
      throw new Error('Keine Metadaten vorhanden')
    }

    // Validiere erforderliche Felder
    if (!metadata.templateId || !metadata.contentId || !metadata.type || !metadata.lastUpdated) {
      throw new Error('Ungültige Metadaten-Struktur')
    }

    // Extrahiere den relevanten Text
    const content = metadata.text || metadata.content || ''
    delete metadata.text
    delete metadata.content

    // Erstelle eine neue Metadaten-Struktur
    const validatedMetadata: PineconeBaseMetadata = {
      templateId: metadata.templateId,
      contentId: metadata.contentId,
      type: metadata.type,
      lastUpdated: metadata.lastUpdated,
      searchableContent: content
    }

    // Füge optionale Felder hinzu
    if (metadata.section) validatedMetadata.section = metadata.section
    if (metadata.hierarchy) validatedMetadata.hierarchy = metadata.hierarchy
    if (metadata.validFrom) validatedMetadata.validFrom = metadata.validFrom
    if (metadata.validUntil) validatedMetadata.validUntil = metadata.validUntil
    if (metadata.actions) validatedMetadata.actions = metadata.actions
    if (metadata.media) validatedMetadata.media = metadata.media

    return validatedMetadata as PineconeMetadata
  }

  /**
   * Generiert eine Antwort aus den Suchergebnissen
   */
  private async generateAnswerFromResults(
    query: string,
    results: SearchResult[],
    context: VectorContext
  ): Promise<VectorResponse> {
    if (results.length === 0) {
      return this.getDefaultResponse(context)
    }

    // Extrahiere relevante Informationen
    const relevantInfo = results.map(result => ({
      content: result.metadata.searchableContent || '',
      score: result.score,
      type: result.metadata.type
    }))

    // Generiere Prompt
    const prompt = this.generatePrompt(query, relevantInfo, context)

    // Generiere Antwort mit OpenAI
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'Du bist ein hilfreicher Assistent, der präzise und relevante Antworten gibt.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    })

    const answer = completion.choices[0].message.content

    // Bestimme den dominanten Content-Type
    const dominantType = this.determineDominantType(results)

    return {
      type: dominantType,
      text: answer || 'Keine Antwort generiert.',
      confidence: this.calculateAverageScore(results),
      metadata: {
        sources: results.map(r => r.id),
        types: results.map(r => r.metadata.type)
      }
    }
  }

  /**
   * Generiert einen Prompt für die Antwortgenerierung
   */
  private generatePrompt(
    query: string,
    relevantInfo: Array<{ content: string; score: number; type: string }>,
    context: VectorContext
  ): string {
    const contextInfo = context.previousResponses
      ? `\nVorherige Antworten: ${context.previousResponses.map(r => r.text).join('\n')}`
      : ''

    return `
Frage: ${query}

Relevante Informationen:
${relevantInfo.map(info => `- ${info.content} (Relevanz: ${info.score})`).join('\n')}

${contextInfo}

Bitte generiere eine präzise und hilfreiche Antwort basierend auf diesen Informationen.
Berücksichtige dabei die Relevanz der einzelnen Informationen.
Die Antwort sollte klar strukturiert und leicht verständlich sein.`
  }

  /**
   * Bestimmt den dominanten Content-Type aus den Ergebnissen
   */
  private determineDominantType(results: SearchResult[]): ContentType {
    const typeCounts = results.reduce((counts, result) => {
      const type = result.metadata.type as ContentType
      counts[type] = (counts[type] || 0) + 1
      return counts
    }, {} as Record<ContentType, number>)

    let maxCount = 0
    let dominantType: ContentType = 'info'

    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > maxCount) {
        maxCount = count
        dominantType = type as ContentType
      }
    }

    return dominantType
  }

  /**
   * Berechnet die durchschnittliche Konfidenz aus den Suchergebnissen
   */
  private calculateAverageScore(results: SearchResult[]): number {
    if (results.length === 0) return 0

    const sum = results.reduce((acc, result) => acc + result.score, 0)
    return sum / results.length
  }

  /**
   * Berechnet die Gesamt-Konfidenz der Antwort
   */
  private calculateConfidence(
    response: VectorResponse,
    results: SearchResult[]
  ): number {
    let confidence = response.confidence

    // Berücksichtige die Anzahl der Ergebnisse
    confidence *= Math.min(results.length / 3, 1)

    // Berücksichtige die Qualität der Antwort
    const textLength = response.text.length
    if (textLength < 50 || textLength > 1000) {
      confidence *= 0.8
    }

    // Stelle sicher, dass die Konfidenz im gültigen Bereich liegt
    return Math.max(0, Math.min(1, confidence))
  }

  /**
   * Generiert eine Standard-Antwort
   */
  private getDefaultResponse(context: VectorContext): VectorResponse {
    return {
      type: 'info',
      text: 'Entschuldigung, ich konnte keine relevanten Informationen finden.',
      confidence: 0.5,
      metadata: {
        query: context.query,
        templateId: context.templateId,
        source: 'default'
      }
    }
  }

  /**
   * Optimiert die Suchparameter basierend auf Feedback und Metadaten
   */
  public async optimizeSearchParameters(metadata: Record<string, unknown>): Promise<void> {
    const {
      queryType = 'default',
      threshold = this.defaultThreshold,
      topK = this.defaultTopK
    } = metadata;

    // Aktualisiere die Suchparameter basierend auf den Metadaten
    if (queryType === 'semantic') {
      this.threshold = Math.min(threshold as number, 0.8);
      this.topK = Math.max(topK as number, 5);
    } else {
      this.threshold = threshold as number;
      this.topK = topK as number;
    }

    // Speichere die optimierten Parameter
    await this.saveOptimizedParameters();
  }

  private async saveOptimizedParameters(): Promise<void> {
    // TODO: Implementiere das Speichern der optimierten Parameter
  }
} 