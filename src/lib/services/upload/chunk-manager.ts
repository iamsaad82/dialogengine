import { Logger } from '@/lib/utils/logger'

interface ChunkOptions {
  maxTokens?: number
  avgCharsPerToken?: number
  overlapTokens?: number
}

export class ChunkManager {
  private readonly maxTokens: number
  private readonly avgCharsPerToken: number
  private readonly overlapTokens: number
  private readonly logger: Logger

  constructor(options?: ChunkOptions) {
    this.maxTokens = options?.maxTokens || 7500 // Sicherheitsabstand zu 8192
    this.avgCharsPerToken = options?.avgCharsPerToken || 4
    this.overlapTokens = options?.overlapTokens || 200
    this.logger = new Logger('ChunkManager')
  }

  async splitContentIntoChunks(content: string): Promise<string[]> {
    const chunks: string[] = []
    const paragraphs = content.split(/\n\s*\n/)
    let currentChunk = ''
    let currentTokens = 0

    for (const paragraph of paragraphs) {
      const paragraphTokens = this.estimateTokenCount(paragraph)
      
      // Wenn ein einzelner Paragraph zu groß ist
      if (paragraphTokens > this.maxTokens) {
        if (currentChunk) {
          chunks.push(currentChunk.trim())
          currentChunk = ''
          currentTokens = 0
        }
        
        // Teile großen Paragraph in Sätze
        const sentences = paragraph.split(/[.!?]+\s+/)
        let sentenceChunk = ''
        let sentenceTokens = 0
        
        for (const sentence of sentences) {
          const tokens = this.estimateTokenCount(sentence)
          if (sentenceTokens + tokens > this.maxTokens) {
            if (sentenceChunk) chunks.push(sentenceChunk.trim())
            sentenceChunk = sentence + '. '
            sentenceTokens = tokens
          } else {
            sentenceChunk += sentence + '. '
            sentenceTokens += tokens
          }
        }
        
        if (sentenceChunk) chunks.push(sentenceChunk.trim())
        continue
      }

      // Normaler Fall: Füge Paragraphen zu Chunks hinzu
      if (currentTokens + paragraphTokens > this.maxTokens) {
        chunks.push(currentChunk.trim())
        currentChunk = paragraph + '\n\n'
        currentTokens = paragraphTokens
      } else {
        currentChunk += paragraph + '\n\n'
        currentTokens += paragraphTokens
      }
    }

    if (currentChunk) chunks.push(currentChunk.trim())

    this.logger.info(`Content aufgeteilt in ${chunks.length} Chunks`)
    return this.addOverlap(chunks)
  }

  private addOverlap(chunks: string[]): string[] {
    if (chunks.length <= 1) return chunks
    
    return chunks.map((chunk, index) => {
      if (index === 0) return chunk
      
      const prevChunk = chunks[index - 1]
      const overlap = this.getOverlap(prevChunk)
      return overlap + chunk
    })
  }

  private getOverlap(text: string): string {
    const words = text.split(/\s+/)
    const overlapWordCount = Math.ceil(this.overlapTokens * this.avgCharsPerToken / 5) // ~5 Zeichen pro Wort
    return words.slice(-overlapWordCount).join(' ') + ' '
  }

  estimateTokenCount(text: string): number {
    // Berücksichtige Sonderzeichen und Formatierung
    const cleanedText = text
      .replace(/\s+/g, ' ')
      .trim()
    return Math.ceil(cleanedText.length / this.avgCharsPerToken)
  }

  getStats(): { maxTokens: number, avgCharsPerToken: number, overlapTokens: number } {
    return {
      maxTokens: this.maxTokens,
      avgCharsPerToken: this.avgCharsPerToken,
      overlapTokens: this.overlapTokens
    }
  }
} 