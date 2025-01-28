import OpenAI from 'openai'
import { Redis } from '@upstash/redis'
import { chunk } from '@/lib/utils'

// Kostengünstige Caching-Lösung
const redis = Redis.fromEnv()

export class OpenAIEmbedding {
  private openai: OpenAI
  
  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey })
  }
  
  public async getEmbedding(text: string): Promise<number[]> {
    const cacheKey = `embed:${text}`
    
    // Prüfen ob Embedding bereits im Cache
    const cached = await redis.get<number[]>(cacheKey)
    if (cached) return cached
    
    // Neues Embedding erstellen
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small', // Günstigeres Modell
      input: text,
      dimensions: 384 // Kleinere Dimension für bessere Performance
    })
    
    const embedding = response.data[0].embedding
    
    // Im Cache speichern (7 Tage)
    await redis.set(cacheKey, embedding, { ex: 7 * 24 * 60 * 60 })
    
    return embedding
  }
  
  public async embedChunks(chunks: string[]): Promise<{ text: string; vector: number[] }[]> {
    const results: { text: string; vector: number[] }[] = []
    
    // Chunks in Batches verarbeiten (max. 10 pro Anfrage)
    for (let i = 0; i < chunks.length; i += 10) {
      const batch = chunks.slice(i, i + 10)
      const embeddings = await Promise.all(
        batch.map(async (text: string) => ({
          text,
          vector: await this.getEmbedding(text)
        }))
      )
      results.push(...embeddings)
    }
    
    return results
  }
  
  public async findSimilar(query: string, vectors: { text: string; vector: number[] }[], count = 3): Promise<string[]> {
    const queryVector = await this.getEmbedding(query)
    
    // Kosinus-Ähnlichkeit berechnen
    const similarities = vectors.map(({ text, vector }) => ({
      text,
      similarity: this.cosineSimilarity(queryVector, vector)
    }))
    
    // Nach Ähnlichkeit sortieren und Top-N zurückgeben
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, count)
      .map(({ text }) => text)
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
    return dotProduct / (magnitudeA * magnitudeB)
  }
} 