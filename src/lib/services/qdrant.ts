import { QdrantClient } from '@qdrant/js-client-rest'

export class VectorStore {
  private client: QdrantClient
  private collectionName: string

  constructor(collectionName: string) {
    this.client = new QdrantClient({ url: process.env.QDRANT_URL || 'http://localhost:6333' })
    this.collectionName = collectionName
  }

  async initialize() {
    try {
      // Prüfen ob Collection existiert
      const collections = await this.client.getCollections()
      const exists = collections.collections.some(c => c.name === this.collectionName)

      if (!exists) {
        // Collection erstellen
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: 384, // Dimension der OpenAI Embeddings
            distance: 'Cosine'
          }
        })
      }
    } catch (error) {
      console.error('Fehler beim Initialisieren der Vector Collection:', error)
      throw error
    }
  }

  async upsertVectors(vectors: { id: string; values: number[]; payload: any }[]) {
    try {
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: vectors.map(v => ({
          id: v.id,
          vector: v.values,
          payload: v.payload
        }))
      })
    } catch (error) {
      console.error('Fehler beim Speichern der Vektoren:', error)
      throw error
    }
  }

  async searchSimilar(vector: number[], limit: number = 3) {
    try {
      const results = await this.client.search(this.collectionName, {
        vector,
        limit,
        with_payload: true
      })

      return results.map(r => ({
        score: r.score,
        payload: r.payload
      }))
    } catch (error) {
      console.error('Fehler bei der Ähnlichkeitssuche:', error)
      throw error
    }
  }

  async deleteCollection() {
    try {
      await this.client.deleteCollection(this.collectionName)
    } catch (error) {
      console.error('Fehler beim Löschen der Collection:', error)
      throw error
    }
  }
} 