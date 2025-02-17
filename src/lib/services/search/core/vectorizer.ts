import { OpenAI } from 'openai'
import { Pinecone, Index, RecordMetadata } from '@pinecone-database/pinecone'
import { SearchResult, ContentType } from '../types'
import { MonitoringService } from '../../../monitoring/monitoring'

interface VectorizerConfig {
  openai: OpenAI
  pinecone: Pinecone
  indexName: string
  monitoring?: MonitoringService
}

interface PineconeMetadata extends RecordMetadata {
  url?: string
  title?: string
  content?: string
  type?: ContentType
  vectorized_at?: string
  [key: string]: any
}

export class ContentVectorizer {
  private readonly openai: OpenAI
  private readonly pinecone: Pinecone
  private readonly indexName: string
  private readonly index: Index
  private readonly monitoring?: MonitoringService

  constructor(config: VectorizerConfig) {
    this.openai = config.openai
    this.pinecone = config.pinecone
    this.indexName = config.indexName
    this.index = this.pinecone.index(this.indexName)
    this.monitoring = config.monitoring
  }

  public async vectorizeQuery(query: string): Promise<number[]> {
    const startTime = Date.now()
    try {
      const embedding = await this.createEmbedding(query)
      
      if (this.monitoring) {
        const duration = (Date.now() - startTime) / 1000
        this.monitoring.recordSearchLatency(duration, 'vectorize-query')
        this.monitoring.recordSearchRequest('success', 'vectorize-query')
      }
      
      return embedding
    } catch (error) {
      if (this.monitoring) {
        this.monitoring.recordSearchRequest('error', 'vectorize-query')
        this.monitoring.recordError('vectorization', 'query-error')
      }
      throw error
    }
  }

  public async searchSimilar(
    queryVector: number[],
    options?: {
      topK?: number
      minScore?: number
      namespace?: string
    }
  ): Promise<SearchResult[]> {
    const startTime = Date.now()
    try {
      const { topK = 10, minScore = 0.7 } = options || {}

      const queryResponse = await this.index.query({
        vector: queryVector,
        topK,
        includeMetadata: true
      })

      if (this.monitoring) {
        const duration = (Date.now() - startTime) / 1000
        this.monitoring.recordSearchLatency(duration, 'similar-search')
        this.monitoring.recordSearchRequest('success', 'similar-search')
      }

      return queryResponse.matches
        .filter(match => (match.score || 0) >= minScore)
        .map(match => {
          const metadata = match.metadata as PineconeMetadata || {}
          return {
            content: String(metadata.content || ''),
            type: metadata.type || 'text',
            metadata: {
              url: metadata.url,
              title: metadata.title,
              ...metadata
            },
            score: match.score || 0
          }
        })
    } catch (error) {
      if (this.monitoring) {
        this.monitoring.recordSearchRequest('error', 'similar-search')
        this.monitoring.recordError('search', 'similar-search-error')
      }
      throw error
    }
  }

  private async createEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text
    })

    return response.data[0].embedding
  }

  public async vectorizeContent(
    content: string,
    metadata: Record<string, any>
  ): Promise<void> {
    const startTime = Date.now()
    try {
      const vector = await this.createEmbedding(content)
      
      await this.index.upsert([{
        id: metadata.url || `doc_${Date.now()}`,
        values: vector,
        metadata: {
          ...metadata,
          content,
          vectorized_at: new Date().toISOString()
        }
      }])

      if (this.monitoring) {
        const duration = (Date.now() - startTime) / 1000
        this.monitoring.recordSearchLatency(duration, 'vectorize-content')
        this.monitoring.recordSearchRequest('success', 'vectorize-content')
      }
    } catch (error) {
      if (this.monitoring) {
        this.monitoring.recordSearchRequest('error', 'vectorize-content')
        this.monitoring.recordError('vectorization', 'content-error')
      }
      throw error
    }
  }

  public async deleteVectors(
    ids: string[],
    namespace?: string
  ): Promise<void> {
    const startTime = Date.now()
    try {
      await this.index.deleteMany(ids)
      
      if (this.monitoring) {
        const duration = (Date.now() - startTime) / 1000
        this.monitoring.recordSearchLatency(duration, 'delete-vectors')
        this.monitoring.recordSearchRequest('success', 'delete-vectors')
      }
    } catch (error) {
      if (this.monitoring) {
        this.monitoring.recordSearchRequest('error', 'delete-vectors')
        this.monitoring.recordError('vectorization', 'delete-error')
      }
      throw error
    }
  }
} 