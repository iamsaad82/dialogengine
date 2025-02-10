import { OpenAI } from 'openai'
import { Pinecone, Index, RecordMetadata } from '@pinecone-database/pinecone'
import { VectorizationConfig, SearchResult, ContentType } from '../types'

interface VectorizerConfig {
  openai: OpenAI
  pinecone: Pinecone
  indexName: string
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

  constructor(config: VectorizerConfig) {
    this.openai = config.openai
    this.pinecone = config.pinecone
    this.indexName = config.indexName
    this.index = this.pinecone.index(this.indexName)
  }

  public async vectorizeQuery(query: string): Promise<number[]> {
    const embedding = await this.createEmbedding(query)
    return embedding
  }

  public async searchSimilar(
    queryVector: number[],
    options?: {
      topK?: number
      minScore?: number
      namespace?: string
    }
  ): Promise<SearchResult[]> {
    const { topK = 10, minScore = 0.7 } = options || {}

    const queryResponse = await this.index.query({
      vector: queryVector,
      topK,
      includeMetadata: true
    })

    return queryResponse.matches
      .filter(match => (match.score || 0) >= minScore)
      .map(match => {
        const metadata = match.metadata as PineconeMetadata || {}
        return {
          url: String(metadata.url || ''),
          title: String(metadata.title || ''),
          content: String(metadata.content || ''),
          score: match.score || 0,
          metadata: {
            type: metadata.type,
            url: metadata.url,
            title: metadata.title,
            description: metadata.description,
            ...metadata
          }
        }
      })
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
    metadata: Record<string, any>,
    config?: VectorizationConfig
  ): Promise<void> {
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
  }

  public async deleteVectors(
    ids: string[],
    namespace?: string
  ): Promise<void> {
    await this.index.deleteMany(ids)
  }
} 