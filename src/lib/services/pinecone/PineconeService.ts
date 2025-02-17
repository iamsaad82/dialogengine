import { Pinecone, Index } from '@pinecone-database/pinecone'
import { OpenAI } from 'openai'
import { MonitoringService } from '../../monitoring/monitoring'
import { ProcessedDocument } from '../document/types'
import { ContentTypeEnum } from '../../types/contentTypes'
import { RecordMetadataValue, InteractiveElement } from '../../types/pinecone'

interface PineconeServiceConfig {
  apiKey: string
  indexName: string
  openAIApiKey?: string
  monitoring?: MonitoringService
}

interface IndexConfig {
  name: string
  dimension: number
  metric: 'cosine' | 'euclidean' | 'dotproduct'
}

interface TemplateMetadata {
  relatedTopics?: {
    interactiveElements?: InteractiveElement[]
  }
}

export class PineconeService {
  private openai?: OpenAI
  private index: Index
  private monitoring?: MonitoringService
  private pinecone: Pinecone
  private indexName: string

  constructor(config: PineconeServiceConfig) {
    if (config.openAIApiKey) {
      this.openai = new OpenAI({ apiKey: config.openAIApiKey })
    }
    
    this.pinecone = new Pinecone({ apiKey: config.apiKey })
    this.monitoring = config.monitoring
    this.indexName = config.indexName
    
    // Index initialisieren
    this.index = this.pinecone.index(config.indexName)
  }

  // Statische Methode für Index-Verwaltung
  static async createIndexIfNotExists(
    apiKey: string, 
    indexConfig: IndexConfig
  ): Promise<void> {
    const pinecone = new Pinecone({ apiKey })
    
    try {
      // Prüfe ob Index existiert
      const indexes = await pinecone.listIndexes()
      const indexExists = Object.keys(indexes).includes(indexConfig.name)
      
      if (!indexExists) {
        console.log(`[PineconeService] Erstelle Index: ${indexConfig.name}`)
        
        // Erstelle Index mit den spezifizierten Parametern
        await pinecone.createIndex({
          name: indexConfig.name,
          dimension: indexConfig.dimension,
          metric: indexConfig.metric,
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-west-2'
            }
          }
        })

        // Warte auf Index-Bereitschaft
        let isReady = false
        let attempts = 0
        const maxAttempts = 60

        while (!isReady && attempts < maxAttempts) {
          const description = await pinecone.describeIndex(indexConfig.name)
          if (description.status?.ready) {
            isReady = true
            console.log(`[PineconeService] Index ${indexConfig.name} ist bereit`)
          } else {
            attempts++
            await new Promise(resolve => setTimeout(resolve, 5000))
          }
        }

        if (!isReady) {
          throw new Error(`Timeout beim Warten auf Index ${indexConfig.name}`)
        }
      }
    } catch (error) {
      console.error('Fehler bei der Index-Verwaltung:', error)
      throw error
    }
  }

  async ensureTemplateIndex(templateId: string): Promise<void> {
    const templateIndexName = `${this.indexName}-${templateId}`
    
    try {
      // Prüfe ob Index bereits existiert
      const indexes = await this.pinecone.listIndexes()
      const indexExists = indexes.indexes?.some(index => index.name === templateIndexName)

      if (!indexExists) {
        console.log(`[PineconeService] Erstelle neuen Index für Template ${templateId}`)
        await this.pinecone.createIndex({
          name: templateIndexName,
          dimension: 1536,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-west-2'
            }
          }
        })

        // Warte bis Index bereit ist
        let isReady = false
        let attempts = 0
        const maxAttempts = 60

        while (!isReady && attempts < maxAttempts) {
          const status = await this.pinecone.describeIndex(templateIndexName)
          isReady = status.status?.ready || false
          if (!isReady) {
            attempts++
            await new Promise(resolve => setTimeout(resolve, 5000))
          }
        }

        if (!isReady) {
          throw new Error(`Timeout beim Warten auf Index ${templateIndexName}`)
        }
      }
    } catch (error) {
      console.error(`[PineconeService] Fehler beim Erstellen des Template-Index:`, error)
      throw error
    }
  }

  async generateEmbeddings(text: string): Promise<number[]> {
    if (!this.openai) {
      throw new Error('OpenAI API Key nicht konfiguriert')
    }

    const response = await this.openai.embeddings.create({
      input: text,
      model: 'text-embedding-3-small'
    })

    return response.data[0].embedding
  }

  async upsert({ id, values, metadata, templateId }: {
    id: string
    values: number[]
    metadata: Record<string, any>
    templateId: string
  }) {
    const templateIndexName = `${this.indexName}-${templateId}`
    const index = this.pinecone.index(templateIndexName)

    try {
      // Prüfe ob Dokument bereits existiert
      const queryResponse = await index.query({
        vector: values,
        topK: 1,
        filter: { id }
      })

      // Wenn Dokument existiert und Inhalt unterschiedlich ist, aktualisiere es
      if (queryResponse.matches?.length > 0) {
        const existingDoc = queryResponse.matches[0]
        if (existingDoc.metadata?.content !== metadata.content) {
          console.log(`[PineconeService] Aktualisiere existierendes Dokument ${id}`)
          await index.upsert([{
            id,
            values,
            metadata: {
              ...metadata,
              lastUpdated: new Date().toISOString()
            }
          }])
        } else {
          console.log(`[PineconeService] Dokument ${id} unverändert, keine Aktualisierung nötig`)
        }
      } else {
        // Neues Dokument
        console.log(`[PineconeService] Füge neues Dokument ${id} hinzu`)
        await index.upsert([{
          id,
          values,
          metadata
        }])
      }

      return { success: true }
    } catch (error) {
      console.error(`[PineconeService] Fehler beim Upsert:`, error)
      throw error
    }
  }

  async query(params: {
    vector: number[]
    topK?: number
    filter?: Record<string, any>
    templateId?: string
  }): Promise<any> {
    const startTime = Date.now()
    try {
      // Verwende den Template-spezifischen Index, falls templateId vorhanden
      const indexToUse = params.templateId 
        ? this.pinecone.index(`${this.indexName}-${params.templateId}`)
        : this.index

      const result = await indexToUse.query({
        vector: params.vector,
        topK: params.topK || 5,
        filter: params.filter,
        includeMetadata: true
      })

      const duration = (Date.now() - startTime) / 1000
      this.monitoring?.recordHandlerLatency(duration)

      return result
    } catch (error) {
      this.monitoring?.recordError('query', error instanceof Error ? error.message : 'unknown')
      throw error
    }
  }

  async deleteAll(): Promise<void> {
    const startTime = Date.now()
    try {
      await this.index.deleteAll()

      const duration = (Date.now() - startTime) / 1000
      this.monitoring?.recordHandlerLatency(duration)
    } catch (error) {
      this.monitoring?.recordError('deleteAll', error instanceof Error ? error.message : 'unknown')
      throw error
    }
  }

  private prepareMetadata(document: ProcessedDocument): Record<string, RecordMetadataValue> {
    const baseMetadata: Record<string, RecordMetadataValue> = {
      id: document.metadata.id,
      type: document.metadata.type,
      title: document.metadata.title || '',
      language: document.metadata.language,
      source: document.metadata.source,
      lastModified: document.metadata.lastModified,
      templateId: document.metadata.templateId,
      templateMetadata: JSON.stringify(document.metadata.templateMetadata)
    }

    if (document.metadata.relatedTopics) {
      baseMetadata.relatedTopics = JSON.stringify(document.metadata.relatedTopics)
      if (document.metadata.relatedTopics.interactiveElements?.length) {
        baseMetadata.interactiveElements = JSON.stringify(document.metadata.relatedTopics.interactiveElements)
      }
    }

    switch (document.metadata.type) {
      case ContentTypeEnum.MEDICAL:
        return {
          ...baseMetadata,
          medical: JSON.stringify(document.metadata.templateMetadata)
        }
      case ContentTypeEnum.INSURANCE:
        return {
          ...baseMetadata,
          insurance: JSON.stringify(document.metadata.templateMetadata)
        }
      case ContentTypeEnum.CITY_ADMINISTRATION:
        return {
          ...baseMetadata,
          cityAdmin: JSON.stringify(document.metadata.templateMetadata)
        }
      default:
        return baseMetadata
    }
  }
} 