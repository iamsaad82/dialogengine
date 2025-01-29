import OpenAI from 'openai'
import { Redis } from '@upstash/redis'
import { chunk } from '@/lib/utils'

// Kostengünstige Caching-Lösung
const redis = Redis.fromEnv()

export class OpenAIEmbedding {
  constructor() {
    throw new Error('OpenAI Embeddings sind derzeit in Entwicklung.');
  }
  
  public async getEmbedding(): Promise<number[]> {
    throw new Error('OpenAI Embeddings sind derzeit in Entwicklung.');
  }
  
  public async embedChunks(): Promise<{ text: string; vector: number[] }[]> {
    throw new Error('OpenAI Embeddings sind derzeit in Entwicklung.');
  }
  
  public async findSimilar(): Promise<string[]> {
    throw new Error('OpenAI Embeddings sind derzeit in Entwicklung.');
  }
}

export const getEmbeddings = async (text: string) => {
  if (!process.env.OPENAI_API_KEY) {
    console.log('OpenAI API Key nicht konfiguriert')
    return null
  }
  
  try {
    // ... rest of the code ...
  } catch (error) {
    console.error('Fehler beim Erstellen der Embeddings:', error)
    return null
  }
} 