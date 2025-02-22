import { Logger } from '@/lib/utils/logger'
import { ContentVectorizer } from '@/lib/services/vectorizer'
import { ChunkManager } from '@/lib/services/upload/chunk-manager'
import type { 
  TopicSection,
  ProcessingError,
  VectorResult,
  VectorMetadata
} from '@/lib/types/upload'

interface VectorManagerOptions {
  openaiApiKey: string
  pineconeApiKey: string
  pineconeEnvironment: string
  pineconeIndex: string
  templateId: string
  maxTokens?: number
  avgCharsPerToken?: number
  overlapTokens?: number
  retryLimit?: number
  rateLimitDelay?: number
}

export class VectorManager {
  private logger: Logger
  private vectorizer: ContentVectorizer
  private chunkManager: ChunkManager
  private templateId: string

  constructor(options: VectorManagerOptions) {
    this.logger = new Logger('VectorManager')
    this.templateId = options.templateId
    
    this.vectorizer = new ContentVectorizer({
      openaiApiKey: options.openaiApiKey,
      pineconeApiKey: options.pineconeApiKey,
      pineconeEnvironment: options.pineconeEnvironment,
      pineconeIndex: options.pineconeIndex,
      templateId: options.templateId
    })
    
    this.chunkManager = new ChunkManager({
      maxTokens: options.maxTokens,
      avgCharsPerToken: options.avgCharsPerToken,
      overlapTokens: options.overlapTokens,
      retryLimit: options.retryLimit,
      rateLimitDelay: options.rateLimitDelay
    })
  }

  /**
   * Vektorisiert Content mit Rate-Limiting und Retry-Logik
   */
  public async vectorizeWithRateLimit(
    content: string,
    metadata: VectorMetadata,
    recursionDepth: number = 0
  ): Promise<VectorResult> {
    this.logger.info('Starte Vektorisierung mit Rate-Limiting...')
    let retryCount = 0
    
    // Verhindere zu tiefe Rekursion
    const MAX_RECURSION_DEPTH = 3
    if (recursionDepth > MAX_RECURSION_DEPTH) {
      throw new Error(`Maximale Rekursionstiefe (${MAX_RECURSION_DEPTH}) erreicht. Chunk kann nicht weiter aufgeteilt werden.`)
    }
    
    // Teile Content in Chunks
    const chunks = await this.chunkManager.splitContentIntoChunks(content)
    const results: VectorResult[] = []
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const tokenCount = this.chunkManager.estimateTokenCount(chunk)
      
      this.logger.info(`Verarbeite Chunk ${i + 1}/${chunks.length} (ca. ${tokenCount} Token)`)
      
      while (retryCount < this.chunkManager.getSettings().retryLimit) {
        try {
          // Bereite die Metadaten für Pinecone vor
          const chunkMetadata = this.chunkManager.createChunkMetadata(i, chunks.length, chunk)

          // Konvertiere zusätzliche Metadaten
          const additionalMetadata = Object.entries(metadata).reduce((acc, [key, value]) => {
            if (key !== 'chunk_info' && key !== 'section_range') {
              if (Array.isArray(value)) {
                acc[key] = JSON.stringify(value)
              } else if (typeof value === 'object' && value !== null) {
                acc[key] = JSON.stringify(value)
              } else {
                acc[key] = String(value)
              }
            }
            return acc
          }, {} as Record<string, string>)

          const combinedMetadata: VectorMetadata = {
            filename: metadata.filename || 'unknown',
            path: metadata.path || '/',
            templateId: this.templateId,
            ...chunkMetadata,
            ...additionalMetadata
          }
          
          const result = await this.vectorizer.vectorize({
            content: chunk,
            metadata: combinedMetadata
          })
          
          if (result?.vectors) {
            // Stelle sicher, dass jeder Vektor die erforderlichen Metadaten hat
            const vectorsWithMetadata: VectorResult = {
              vectors: result.vectors.map(vector => ({
                ...vector,
                metadata: {
                  filename: metadata.filename || 'unknown',
                  path: metadata.path || '/',
                  templateId: this.templateId,
                  ...vector.metadata
                }
              })),
              metadata: result.metadata
            }
            results.push(vectorsWithMetadata)
            this.logger.info(`Chunk ${i + 1} erfolgreich vektorisiert`)
            retryCount = 0
            
            if (i < chunks.length - 1) {
              const waitTime = this.chunkManager.getSettings().rateLimitDelay
              this.logger.info(`Warte ${Math.round(waitTime / 1000)} Sekunden vor nächstem Chunk...`)
              await new Promise(resolve => setTimeout(resolve, waitTime))
            }
            
            break
          }
        } catch (error: any) {
          retryCount++
          this.logger.warn(`Fehler bei Chunk ${i + 1}, Versuch ${retryCount}/${this.chunkManager.getSettings().retryLimit}:`, error.message)
          
          if (error.message.includes('maximum context length')) {
            this.logger.info(`Chunk ${i + 1} ist zu groß, teile ihn weiter auf (Rekursionstiefe: ${recursionDepth})`)
            try {
              // Reduziere die Chunk-Größe für die nächste Aufteilung
              const currentSettings = this.chunkManager.getSettings()
              const newChunkSize = Math.floor(currentSettings.chunkSize * 0.75) // Reduziere um 25%
              
              // Erstelle einen neuen ChunkManager mit reduzierter Chunk-Größe
              const subChunkManager = new ChunkManager({
                ...currentSettings,
                chunkSize: newChunkSize
              })
              
              // Teile den problematischen Chunk auf
              const subChunks = await subChunkManager.splitContentIntoChunks(chunk)
              this.logger.info(`Chunk in ${subChunks.length} kleinere Chunks aufgeteilt`)
              
              // Verarbeite jeden Sub-Chunk rekursiv
              for (const subChunk of subChunks) {
                const subResult = await this.vectorizeWithRateLimit(
                  subChunk,
                  metadata,
                  recursionDepth + 1
                )
                if (subResult?.vectors) {
                  results.push(subResult)
                }
              }
              
              // Überspringe den aktuellen Chunk, da er bereits verarbeitet wurde
              break
            } catch (subError) {
              const error = subError instanceof Error ? subError : new Error('Unbekannter Fehler beim Aufteilen des Chunks')
              this.logger.error(`Fehler beim Aufteilen von Chunk ${i + 1}:`, error)
              throw error
            }
          }
          
          if (error.code === 'rate_limit_exceeded') {
            this.logger.info('Rate Limit erreicht, warte eine Minute...')
            await new Promise(resolve => setTimeout(resolve, this.chunkManager.getSettings().rateLimitDelay))
            continue
          }
          
          if (retryCount === this.chunkManager.getSettings().retryLimit) {
            throw new Error(`Maximale Anzahl von Wiederholungsversuchen erreicht für Chunk ${i + 1}`)
          }
          
          // Exponentielles Backoff
          const waitTime = Math.min(1000 * Math.pow(2, retryCount), this.chunkManager.getSettings().rateLimitDelay)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        }
      }
    }
    
    return {
      vectors: results.flatMap(r => r.vectors),
      metadata: {
        count: results.reduce((sum, r) => sum + (r.metadata?.count || 0), 0),
        timestamp: new Date().toISOString(),
        templateId: metadata.templateId,
        processingStats: {
          totalChunks: chunks.length,
          successfulChunks: results.length,
          averageTokensPerChunk: Math.round(
            chunks.reduce((sum, chunk) => sum + this.chunkManager.estimateTokenCount(chunk), 0) / chunks.length
          )
        }
      }
    }
  }

  /**
   * Vektorisiert Content mit mehreren Themenbereichen
   */
  public async vectorizeMultiTopicContent(
    sections: TopicSection[],
    baseMetadata: VectorMetadata
  ): Promise<VectorResult> {
    this.logger.info('Starte Multi-Topic-Vektorisierung...')
    const allResults: VectorResult[] = []
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]
      const sectionMetadata: VectorMetadata = {
        filename: baseMetadata.filename || 'unknown',
        path: baseMetadata.path || '/',
        templateId: this.templateId,
        section_type: section.type,
        section_confidence: section.confidence,
        section_metadata: JSON.stringify(section.metadata),
        section_range: {
          start: (i / sections.length) * 100,
          end: ((i + 1) / sections.length) * 100
        }
      }
      
      const result = await this.vectorizeWithRateLimit(section.content, sectionMetadata)
      if (result?.vectors) {
        allResults.push(result)
      }
    }
    
    // Kombiniere alle Vektoren
    return {
      vectors: allResults.flatMap(r => r.vectors),
      metadata: {
        count: allResults.reduce((sum, r) => sum + (r.metadata?.count || 0), 0),
        timestamp: new Date().toISOString(),
        templateId: baseMetadata.templateId,
        processingStats: {
          totalChunks: allResults.length,
          successfulChunks: allResults.length,
          averageTokensPerChunk: Math.round(
            sections.reduce((sum, section) => sum + this.chunkManager.estimateTokenCount(section.content), 0) / sections.length
          )
        }
      }
    }
  }

  /**
   * Aktualisiert die Metadaten eines Vektors
   */
  public async updateVectorMetadata(
    vectorId: string,
    metadata: VectorMetadata
  ): Promise<void> {
    try {
      await this.vectorizer.vectorize({
        content: '',
        metadata: {
          filename: metadata.filename || 'unknown',
          path: metadata.path || '/',
          templateId: this.templateId,
          id: vectorId
        }
      })
      this.logger.info(`Metadaten für Vektor ${vectorId} aktualisiert`)
    } catch (error) {
      const processingError = error as ProcessingError
      processingError.code = 'vector_metadata_update_failed'
      processingError.context = {
        operation: 'update_metadata',
        metadata: metadata
      }
      throw processingError
    }
  }

  /**
   * Löscht einen Vektor aus dem Index
   */
  public async deleteVector(vectorId: string): Promise<void> {
    try {
      await this.vectorizer.vectorize({
        content: '',
        metadata: {
          filename: 'deleted',
          path: '/',
          templateId: this.templateId,
          id: vectorId,
          delete: true
        }
      })
      this.logger.info(`Vektor ${vectorId} gelöscht`)
    } catch (error) {
      const processingError = error as ProcessingError
      processingError.code = 'vector_deletion_failed'
      processingError.context = {
        operation: 'delete_vector',
        metadata: { vectorId }
      }
      throw processingError
    }
  }
} 