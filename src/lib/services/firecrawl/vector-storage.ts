import { Pinecone, RecordMetadata } from '@pinecone-database/pinecone'
import { OpenAI } from 'openai'
import { FirecrawlConfig } from './types'

interface QueryMatch {
  id: string
  score: number
  metadata: Record<string, any>
}

interface PineconeVector {
  id: string
  values: number[]
  metadata: DocumentMetadata
}

interface BatchProgress {
  totalVectors: number
  processedVectors: number
  currentBatch: number
  totalBatches: number
  status: 'running' | 'completed' | 'failed'
  error?: string
}

interface DocumentMetadata extends RecordMetadata {
  url: string
  title: string
  text: string
  content: string
  contentType: string
  templateId?: string
  language?: string
  lastModified?: string
  [key: string]: any
}

export class VectorStorage {
  private pinecone: Pinecone
  private openai: OpenAI
  private readonly indexName: string
  private readonly batchSize: number = 100 // Erhöht für bessere Performance
  private readonly maxTokens: number = 4000
  private readonly maxRetries: number = 3
  private readonly retryDelay: number = 1000 // 1 Sekunde

  constructor(config: Pick<FirecrawlConfig, 'openaiApiKey' | 'pineconeApiKey' | 'pineconeEnvironment' | 'pineconeIndex' | 'pineconeHost'>) {
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey
    })

    this.pinecone = new Pinecone({
      apiKey: config.pineconeApiKey
    })

    this.indexName = config.pineconeIndex || 'dialog-engine'
  }

  private async validateIndex(): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName)
      
      // Warte auf Index-Bereitschaft
      let isReady = false
      let attempts = 0
      const maxAttempts = 10
      
      while (!isReady && attempts < maxAttempts) {
        const description = await index.describeIndexStats()
        
        if (description) {
          // Zeige Template-spezifische Statistiken
          const templateStats = new Map<string, number>()
          
          if (description.namespaces) {
            for (const [namespace, stats] of Object.entries(description.namespaces)) {
              if (namespace.startsWith('template_')) {
                templateStats.set(namespace.replace('template_', ''), stats.recordCount)
              }
            }
          }

          console.log('Index-Validierung erfolgreich:', {
            indexName: this.indexName,
            totalVectors: description.totalRecordCount,
            dimensions: description.dimension,
            templateStats: Object.fromEntries(templateStats)
          })
          isReady = true
          break
        }
        
        console.log('Warte auf Index-Bereitschaft...')
        await new Promise(resolve => setTimeout(resolve, 2000))
        attempts++
      }
      
      if (!isReady) {
        throw new Error('Index wurde nicht rechtzeitig bereit')
      }
    } catch (error) {
      console.error('Index-Validierung fehlgeschlagen:', error)
      throw new Error(`Index-Validierung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    }
  }

  private splitTextIntoChunks(text: string): string[] {
    // Teile den Text in Absätze
    const paragraphs = text.split('\n\n')
    const chunks: string[] = []
    let currentChunk = ''
    
    for (const paragraph of paragraphs) {
      // Grobe Schätzung der Token (4 Zeichen ≈ 1 Token)
      const estimatedTokens = (currentChunk.length + paragraph.length) / 4
      
      if (estimatedTokens > this.maxTokens) {
        if (currentChunk) {
          chunks.push(currentChunk.trim())
          currentChunk = ''
        }
        
        // Teile lange Paragraphen in kleinere Stücke
        const sentences = paragraph.split(/[.!?]+\s+/)
        for (const sentence of sentences) {
          const sentenceTokens = sentence.length / 4
          
          if (sentenceTokens > this.maxTokens) {
            // Teile sehr lange Sätze in kleinere Stücke
            const words = sentence.split(' ')
            let tempChunk = ''
            
            for (const word of words) {
              if ((tempChunk.length + word.length) / 4 > this.maxTokens) {
                if (tempChunk) chunks.push(tempChunk.trim())
                tempChunk = word
              } else {
                tempChunk += (tempChunk ? ' ' : '') + word
              }
            }
            
            if (tempChunk) chunks.push(tempChunk.trim())
          } else {
            // Füge den Satz zum aktuellen Chunk hinzu oder erstelle einen neuen
            if ((currentChunk.length + sentence.length) / 4 > this.maxTokens) {
              if (currentChunk) chunks.push(currentChunk.trim())
              currentChunk = sentence
            } else {
              currentChunk += (currentChunk ? ' ' : '') + sentence
            }
          }
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim())
    }
    
    // Entferne leere Chunks und zu kurze Texte
    return chunks.filter(chunk => chunk.length > 50)
  }

  async vectorize(text: string): Promise<number[]> {
    try {
      // Teile den Text in Chunks
      const chunks = this.splitTextIntoChunks(text)
      console.log(`Text in ${chunks.length} Chunks aufgeteilt`)
      
      // Erstelle Embeddings für jeden Chunk
      const embeddings: number[][] = []
      for (const chunk of chunks) {
        const response = await this.openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: chunk,
          encoding_format: 'float'
        })
        embeddings.push(response.data[0].embedding)
      }
      
      // Wenn es nur einen Chunk gibt, gib das Embedding direkt zurück
      if (embeddings.length === 1) {
        return embeddings[0]
      }
      
      // Bei mehreren Chunks, berechne den Durchschnitt der Embeddings
      const dimensions = embeddings[0].length
      const averageEmbedding = new Array(dimensions).fill(0)
      
      for (const embedding of embeddings) {
        for (let i = 0; i < dimensions; i++) {
          averageEmbedding[i] += embedding[i]
        }
      }
      
      for (let i = 0; i < dimensions; i++) {
        averageEmbedding[i] /= embeddings.length
      }
      
      return averageEmbedding
    } catch (error) {
      console.error('Fehler bei der Vektorisierung:', error)
      throw new Error(`Vektorisierung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    }
  }

  async upsert(id: string, vector: number[], metadata: Record<string, any> = {}): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName)
      await index.upsert([{
        id,
        values: vector,
        metadata: {
          ...metadata,
          lastUpdated: new Date().toISOString()
        }
      }])
    } catch (error) {
      console.error('Fehler beim Upsert:', error)
      throw new Error(`Upsert fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    }
  }

  async query(vector: number[], topK: number = 5, filter?: Record<string, any>): Promise<QueryMatch[]> {
    try {
      const index = this.pinecone.index(this.indexName)
      const queryResponse = await index.query({
        vector,
        topK,
        includeMetadata: true,
        filter
      })

      return queryResponse.matches.map(match => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata || {}
      }))
    } catch (error) {
      console.error('Fehler bei der Query:', error)
      throw new Error(`Query fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    }
  }

  async delete(ids: string[]): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName)
      await index.deleteMany(ids)
    } catch (error) {
      console.error('Fehler beim Löschen:', error)
      throw new Error(`Löschen fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    }
  }

  async deleteAll(): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName)
      await index.deleteAll()
    } catch (error) {
      console.error('Fehler beim Löschen aller Vektoren:', error)
      throw new Error(`Löschen aller Vektoren fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    }
  }

  private async withRetry<T>(operation: () => Promise<T>, attempt: number = 1): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      if (attempt >= this.maxRetries) {
        throw error
      }
      console.log(`Wiederhole Operation (${attempt}/${this.maxRetries})...`)
      await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt))
      return this.withRetry(operation, attempt + 1)
    }
  }

  private async processBatch(
    batch: PineconeVector[],
    currentBatch: number,
    totalBatches: number
  ): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName)
      console.log(`Verarbeite Batch ${currentBatch}/${totalBatches} (${batch.length} Vektoren)`)
      
      // Verwende Retry-Logik für robustere Verarbeitung
      await this.withRetry(async () => {
        await index.upsert(batch)
      })
      
      console.log(`Batch ${currentBatch}/${totalBatches} erfolgreich verarbeitet`)
    } catch (error) {
      console.error(`Fehler bei Batch ${currentBatch}/${totalBatches}:`, error)
      throw error
    }
  }

  private async checkExistingVectors(ids: string[]): Promise<Map<string, boolean>> {
    try {
      const index = this.pinecone.index(this.indexName)
      const existingMap = new Map<string, boolean>()
      
      // Prüfe Vektoren in Batches von 100
      for (let i = 0; i < ids.length; i += 100) {
        const batchIds = ids.slice(i, i + 100)
        const fetchResponse = await index.fetch(batchIds)
        
        for (const id of batchIds) {
          existingMap.set(id, id in (fetchResponse.records || {}))
        }
      }
      
      return existingMap
    } catch (error) {
      console.error('Fehler beim Prüfen existierender Vektoren:', error)
      throw error
    }
  }

  private shouldUpdateVector(existing: Record<string, any>, newMetadata: Record<string, any>): boolean {
    // Prüfe ob sich relevante Metadaten geändert haben
    const relevantFields = ['content', 'title', 'lastModified']
    
    for (const field of relevantFields) {
      if (existing[field] !== newMetadata[field]) {
        return true
      }
    }
    
    // Prüfe ob der letzte Update älter als 24 Stunden ist
    const lastUpdated = new Date(existing.lastUpdated || 0)
    const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
    
    return daysSinceUpdate > 1
  }

  async batchUpsert(vectors: PineconeVector[], onProgress?: (progress: BatchProgress) => void): Promise<void> {
    try {
      await this.validateIndex()
      
      // Prüfe existierende Vektoren
      const ids = vectors.map(v => v.id)
      const existingVectors = await this.checkExistingVectors(ids)
      
      // Filtere nur die Vektoren, die aktualisiert werden müssen
      const vectorsToUpdate = vectors.filter(vector => {
        const exists = existingVectors.get(vector.id)
        if (!exists) return true // Neue Vektoren immer einfügen
        
        // Prüfe ob Update notwendig ist
        const existing = this.pinecone.index(this.indexName).fetch([vector.id])
        return this.shouldUpdateVector((existing as any).vectors[vector.id]?.metadata || {}, vector.metadata)
      })
      
      console.log(`${vectorsToUpdate.length} von ${vectors.length} Vektoren müssen aktualisiert werden`)
      
      const totalBatches = Math.ceil(vectorsToUpdate.length / this.batchSize)
      let processedVectors = 0
      
      // Optimierte Batch-Verarbeitung
      for (let i = 0; i < vectorsToUpdate.length; i += this.batchSize) {
        const currentBatch = Math.floor(i / this.batchSize) + 1
        const batch = vectorsToUpdate.slice(i, i + this.batchSize)
        
        try {
          await this.processBatch(batch, currentBatch, totalBatches)
          processedVectors += batch.length
          
          if (onProgress) {
            onProgress({
              totalVectors: vectorsToUpdate.length,
              processedVectors,
              currentBatch,
              totalBatches,
              status: 'running'
            })
          }
          
          // Dynamische Wartezeit zwischen Batches
          if (i + this.batchSize < vectorsToUpdate.length) {
            const waitTime = Math.min(batch.length * 10, 2000)
            await new Promise(resolve => setTimeout(resolve, waitTime))
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
          if (onProgress) {
            onProgress({
              totalVectors: vectorsToUpdate.length,
              processedVectors,
              currentBatch,
              totalBatches,
              status: 'failed',
              error: errorMessage
            })
          }
          throw error
        }
      }
      
      if (onProgress) {
        onProgress({
          totalVectors: vectorsToUpdate.length,
          processedVectors,
          currentBatch: totalBatches,
          totalBatches,
          status: 'completed'
        })
      }
      
      console.log('Batch-Upsert erfolgreich abgeschlossen')
    } catch (error) {
      console.error('Fehler beim Batch-Upsert:', error)
      throw new Error(`Batch-Upsert fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    }
  }

  public async indexContent(documents: Array<{
    url: string
    title: string
    content: string
    metadata?: {
      templateId?: string
      contentType?: string
      language?: string
      lastModified?: string
    }
  }>, onProgress?: (progress: BatchProgress) => void): Promise<void> {
    try {
      await this.validateIndex()
      
      // Gruppiere Dokumente nach Template
      const templateGroups = new Map<string, typeof documents>()
      
      for (const doc of documents) {
        const templateId = doc.metadata?.templateId || 'default'
        if (!templateGroups.has(templateId)) {
          templateGroups.set(templateId, [])
        }
        const group = templateGroups.get(templateId)
        if (group) {
          group.push(doc)
        }
      }
      
      console.log(`Starte Indexierung für ${templateGroups.size} Templates:`, 
        Array.from(templateGroups.keys()))

      let totalProcessed = 0
      const totalDocuments = documents.length

      // Verarbeite jedes Template separat
      for (const [templateId, templateDocs] of templateGroups) {
        console.log(`\nVerarbeite Template ${templateId} (${templateDocs.length} Dokumente)`)
        
        // Erstelle Vektoren für die Dokumente dieses Templates
        const vectors: PineconeVector[] = []
        
        // Verarbeite Dokumente parallel in Chunks
        const chunkSize = 5
        for (let i = 0; i < templateDocs.length; i += chunkSize) {
          const chunk = templateDocs.slice(i, i + chunkSize)
          const chunkPromises = chunk.map(async (doc) => {
            if (!doc.content) {
              console.warn(`Überspringe Dokument ohne Inhalt: ${doc.url}`)
              return null
            }

            try {
              const embedding = await this.vectorize(doc.content)
              
              const truncatedContent = doc.content.slice(0, 1000) + 
                (doc.content.length > 1000 ? '...' : '')
              
              const metadata: DocumentMetadata = {
                url: doc.url,
                title: doc.title,
                text: doc.content,
                content: doc.content,
                contentType: doc.metadata?.contentType || 'info',
                templateId: doc.metadata?.templateId,
                language: doc.metadata?.language || 'de',
                lastModified: doc.metadata?.lastModified || new Date().toISOString()
              }

              return {
                id: `${templateId}_${Buffer.from(doc.url).toString('base64')}`,
                values: embedding,
                metadata
              }
            } catch (error) {
              console.error(`Fehler beim Erstellen des Embeddings für ${doc.url}:`, error)
              return null
            }
          })

          const chunkResults = await Promise.all(chunkPromises)
          const validResults = chunkResults.filter((result): result is PineconeVector => result !== null)
          vectors.push(...validResults)

          totalProcessed += chunk.length
          if (onProgress) {
            onProgress({
              totalVectors: totalDocuments,
              processedVectors: totalProcessed,
              currentBatch: Math.floor(totalProcessed / this.batchSize) + 1,
              totalBatches: Math.ceil(totalDocuments / this.batchSize),
              status: 'running'
            })
          }
        }

        // Batch-Verarbeitung der Vektoren für dieses Template
        const totalBatches = Math.ceil(vectors.length / this.batchSize)
        
        for (let i = 0; i < vectors.length; i += this.batchSize) {
          const currentBatch = Math.floor(i / this.batchSize) + 1
          const batch = vectors.slice(i, i + this.batchSize)

          try {
            await this.processBatch(batch, currentBatch, totalBatches)
            
            if (i + this.batchSize < vectors.length) {
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler'
            if (onProgress) {
              onProgress({
                totalVectors: totalDocuments,
                processedVectors: totalProcessed,
                currentBatch,
                totalBatches,
                status: 'failed',
                error: errorMessage
              })
            }
            throw error
          }
        }
      }

      if (onProgress) {
        onProgress({
          totalVectors: totalDocuments,
          processedVectors: totalProcessed,
          currentBatch: Math.ceil(totalDocuments / this.batchSize),
          totalBatches: Math.ceil(totalDocuments / this.batchSize),
          status: 'completed'
        })
      }

      console.log('Indexierung erfolgreich abgeschlossen')
    } catch (error) {
      console.error('Fehler bei der Indexierung:', error)
      throw new Error(`Indexierung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`)
    }
  }
} 