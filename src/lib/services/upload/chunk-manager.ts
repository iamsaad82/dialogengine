import { Logger } from '@/lib/utils/logger'
import { TokenEstimator } from '@/lib/utils/upload/token-estimator'
import type { ChunkMetadata, UploadOptions } from '@/lib/types/upload/index'

export class ChunkManager {
  private logger: Logger
  private tokenEstimator: TokenEstimator
  private options: Required<UploadOptions>

  constructor(options: UploadOptions = {}) {
    this.logger = new Logger('ChunkManager')
    this.tokenEstimator = new TokenEstimator({
      maxTokens: options.maxTokens,
      avgCharsPerToken: options.avgCharsPerToken
    })
    
    this.options = {
      maxTokens: options.maxTokens ?? 7500,
      avgCharsPerToken: options.avgCharsPerToken ?? 4,
      overlapTokens: options.overlapTokens ?? 200,
      chunkSize: options.chunkSize ?? 1000,
      retryLimit: options.retryLimit ?? 3,
      rateLimitDelay: options.rateLimitDelay ?? 1000,
      minChunkSize: options.minChunkSize ?? 50000 // 50KB Mindestgröße für Chunking
    }
  }

  /**
   * Schätzt die Anzahl der Tokens in einem Text
   */
  public estimateTokenCount(text: string): number {
    return this.tokenEstimator.estimateTokenCount(text)
  }

  public async splitContentIntoChunks(content: string): Promise<string[]> {
    // Wenn Content kleiner als minChunkSize ist, kein Chunking durchführen
    if (content.length < this.options.minChunkSize) {
      this.logger.info('Content zu klein für Chunking, überspringe Aufteilung')
      return [content]
    }

    this.logger.info('Splitting content into chunks...')
    
    // Teile den Content zunächst in Paragraphen
    const paragraphs = content.split(/\n\s*\n/)
    const chunks: string[] = []
    let currentChunk = ''
    
    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) continue
      
      // Prüfe ob der aktuelle Paragraph + currentChunk das Token-Limit überschreitet
      if (this.tokenEstimator.exceedsLimit(currentChunk + paragraph)) {
        if (currentChunk) {
          chunks.push(currentChunk.trim())
          currentChunk = ''
        }
        
        // Wenn ein einzelner Paragraph zu lang ist, teile ihn in Sätze
        if (this.tokenEstimator.exceedsLimit(paragraph)) {
          const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph]
          for (const sentence of sentences) {
            if (this.tokenEstimator.exceedsLimit(sentence)) {
              this.logger.warn(`Sentence exceeds token limit: ${sentence.substring(0, 100)}...`)
              // Teile den Satz an der optimalen Chunk-Größe
              const optimalSize = this.tokenEstimator.calculateOptimalChunkSize(sentence)
              const subChunks = this.splitTextIntoChunks(sentence, optimalSize)
              chunks.push(...subChunks)
            } else {
              if (this.tokenEstimator.exceedsLimit(currentChunk + sentence)) {
                if (currentChunk) chunks.push(currentChunk.trim())
                currentChunk = sentence
              } else {
                currentChunk += (currentChunk ? ' ' : '') + sentence
              }
            }
          }
        } else {
          currentChunk = paragraph
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim())
    }
    
    // Füge Überlappungen zwischen den Chunks hinzu
    const chunksWithOverlap = this.addOverlap(chunks)
    
    this.logger.info(`Created ${chunksWithOverlap.length} chunks from content`)
    return chunksWithOverlap
  }

  private splitTextIntoChunks(text: string, chunkSize: number): string[] {
    const chunks: string[] = []
    let start = 0
    
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length)
      chunks.push(text.slice(start, end).trim())
      start = end
    }
    
    return chunks
  }

  private addOverlap(chunks: string[]): string[] {
    if (chunks.length <= 1) return chunks
    
    const result: string[] = []
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      if (i > 0) {
        const overlap = this.getOverlap(chunks[i - 1])
        result.push(overlap + chunk)
      } else {
        result.push(chunk)
      }
    }
    
    return result
  }

  private getOverlap(text: string): string {
    const words = text.split(/\s+/)
    const overlapTokenCount = Math.min(
      Math.floor(this.options.overlapTokens / this.options.avgCharsPerToken),
      words.length
    )
    return words.slice(-overlapTokenCount).join(' ')
  }

  public createChunkMetadata(chunkIndex: number, totalChunks: number, chunk: string): ChunkMetadata {
    return {
      chunk_index: chunkIndex.toString(),
      chunk_total: totalChunks.toString(),
      chunk_token_count: this.tokenEstimator.estimateTokenCount(chunk).toString(),
      chunk_retry_count: '0',
      section_range_start: ((chunkIndex / totalChunks) * 100).toFixed(2),
      section_range_end: (((chunkIndex + 1) / totalChunks) * 100).toFixed(2)
    }
  }

  public getSettings(): Required<UploadOptions> {
    return this.options
  }
} 