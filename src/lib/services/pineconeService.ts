import { Pinecone, type CreateIndexOptions, type RecordMetadata, type PineconeRecord, PineconeConfiguration } from '@pinecone-database/pinecone'
import { PineconeMetadata } from '@/lib/types/pinecone'

export type PineconeVector = PineconeRecord<PineconeMetadata & RecordMetadata>

export interface PineconeServiceConfig {
  apiKey: string
  environment: string
  baseIndex?: string
}

export class PineconeService {
  private readonly baseIndex: string
  private readonly environment: string
  private readonly pinecone: Pinecone

  constructor() {
    const apiKey = process.env.PINECONE_API_KEY
    const environment = process.env.PINECONE_ENVIRONMENT
    
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY ist nicht konfiguriert')
    }

    if (!environment) {
      throw new Error('PINECONE_ENVIRONMENT ist nicht konfiguriert')
    }

    try {
      // Konfiguration für Pinecone SDK v4.1.0
      this.pinecone = new Pinecone({
        apiKey,
        controllerHostUrl: process.env.PINECONE_API_URL || 'https://api.pinecone.io'
      })
      
      this.baseIndex = process.env.PINECONE_INDEX || 'dialog-engine'
      this.environment = environment

      // Logging für Debug-Zwecke
      console.log(`[Pinecone] Initialisiert mit Environment: ${environment}`)
      console.log(`[Pinecone] Base Index: ${this.baseIndex}`)
    } catch (error) {
      console.error('[Pinecone] Fehler bei der Initialisierung:', error)
      throw error
    }
  }

  public getPinecone(): Pinecone {
    return this.pinecone
  }

  public getTemplateIndexName(templateId: string): string {
    return `${this.baseIndex}-${templateId}`
  }

  public async ensureIndexExists(
    templateId: string, 
    dimension: number = 1536, 
    metric: 'cosine' | 'euclidean' | 'dotproduct' = 'cosine'
  ): Promise<boolean> {
    const indexName = this.getTemplateIndexName(templateId)
    
    try {
      console.log(`[Pinecone] Prüfe Index: ${indexName}`)
      const indexList = await this.pinecone.listIndexes()
      
      if (!indexList.indexes?.find(index => index.name === indexName)) {
        console.log(`[Pinecone] Erstelle neuen Index: ${indexName}`)
        await this.pinecone.createIndex({
          name: indexName,
          dimension,
          metric,
          spec: {
            serverless: {
              cloud: 'gcp',
              region: 'europe-west4'
            }
          }
        })
        return true
      }
      
      console.log(`[Pinecone] Index ${indexName} existiert bereits`)
      return true
    } catch (error) {
      console.error(`[Pinecone] Fehler beim Erstellen/Prüfen des Index ${indexName}:`, error)
      throw error
    }
  }

  async deleteIndex(templateId: string): Promise<boolean> {
    const indexName = this.getTemplateIndexName(templateId)
    try {
      await this.pinecone.deleteIndex(indexName)
      return true
    } catch (error) {
      console.error(`[Pinecone] Fehler beim Löschen des Index ${indexName}:`, error)
      return false
    }
  }

  async getIndexStats(templateId: string) {
    const indexName = this.getTemplateIndexName(templateId)
    try {
      const index = this.pinecone.index(indexName)
      return await index.describeIndexStats()
    } catch (error) {
      console.error(`[Pinecone] Fehler beim Abrufen der Statistiken für ${indexName}:`, error)
      throw error
    }
  }

  async upsertVectors(
    templateId: string, 
    vectors: PineconeVector[]
  ): Promise<boolean> {
    const indexName = this.getTemplateIndexName(templateId)
    try {
      const index = this.pinecone.index(indexName)
      await index.upsert(vectors)
      return true
    } catch (error) {
      console.error(`[Pinecone] Fehler beim Upsert in ${indexName}:`, error)
      return false
    }
  }

  async query(
    templateId: string,
    queryVector: number[],
    topK: number = 5,
    filter?: Record<string, any>
  ) {
    const indexName = this.getTemplateIndexName(templateId)
    try {
      const index = this.pinecone.index(indexName)
      return await index.query({
        vector: queryVector,
        topK,
        filter,
        includeMetadata: true
      })
    } catch (error) {
      console.error(`[Pinecone] Fehler bei der Abfrage in ${indexName}:`, error)
      throw error
    }
  }

  async deleteAll(templateId: string): Promise<void> {
    const indexName = this.getTemplateIndexName(templateId)
    try {
      const index = this.pinecone.index(indexName)
      await index.deleteAll()
    } catch (error) {
      console.error(`[Pinecone] Fehler beim Löschen aller Vektoren in ${indexName}:`, error)
      throw error
    }
  }

  public async initializeTemplateIndex(
    templateId: string,
    config?: {
      dimension?: number
      metric?: 'cosine' | 'euclidean' | 'dotproduct'
      cloud?: 'gcp' | 'aws'
      region?: string
    }
  ): Promise<boolean> {
    const indexName = this.getTemplateIndexName(templateId)
    
    try {
      console.log(`[Pinecone] Initialisiere Template-Index: ${indexName}`)
      const indexList = await this.pinecone.listIndexes()
      
      if (!indexList.indexes?.find(index => index.name === indexName)) {
        console.log(`[Pinecone] Erstelle neuen Template-Index: ${indexName}`)
        await this.pinecone.createIndex({
          name: indexName,
          dimension: config?.dimension || 1536,
          metric: config?.metric || 'cosine',
          spec: {
            serverless: {
              cloud: config?.cloud || 'gcp',
              region: config?.region || 'europe-west4'
            }
          }
        })
        
        // Warte auf Index-Bereitschaft
        let isReady = false
        let attempts = 0
        const maxAttempts = 10
        
        while (!isReady && attempts < maxAttempts) {
          const indexDescription = await this.pinecone.describeIndex(indexName)
          isReady = indexDescription.status?.ready || false
          
          if (!isReady) {
            console.log(`[Pinecone] Warte auf Index-Bereitschaft: ${indexName}`)
            await new Promise(resolve => setTimeout(resolve, 5000))
            attempts++
          }
        }
        
        if (!isReady) {
          throw new Error(`Index ${indexName} konnte nicht initialisiert werden`)
        }
        
        console.log(`[Pinecone] Template-Index erfolgreich erstellt: ${indexName}`)
        return true
      }
      
      console.log(`[Pinecone] Template-Index existiert bereits: ${indexName}`)
      return true
    } catch (error) {
      console.error(`[Pinecone] Fehler bei der Template-Index-Initialisierung ${indexName}:`, error)
      throw error
    }
  }

  public async getTemplateIndexStats(templateId: string) {
    const indexName = this.getTemplateIndexName(templateId)
    try {
      const index = this.pinecone.index(indexName)
      const stats = await index.describeIndexStats()
      
      console.log(`[Pinecone] Template-Index Statistiken für ${indexName}:`, {
        totalRecords: stats.totalRecordCount,
        namespaces: stats.namespaces,
        dimension: stats.dimension
      })
      
      return stats
    } catch (error) {
      console.error(`[Pinecone] Fehler beim Abrufen der Template-Index-Statistiken für ${indexName}:`, error)
      throw error
    }
  }
} 