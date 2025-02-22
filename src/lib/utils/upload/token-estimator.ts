import { Logger } from '../logger'

export interface TokenEstimatorOptions {
  avgCharsPerToken?: number
  specialCharWeight?: number
  numberWeight?: number
  whitespaceWeight?: number
  maxTokens?: number
  safetyMargin?: number
}

export class TokenEstimator {
  private readonly logger: Logger
  private readonly options: Required<TokenEstimatorOptions>

  constructor(options?: TokenEstimatorOptions) {
    this.logger = new Logger('TokenEstimator')
    this.options = {
      avgCharsPerToken: options?.avgCharsPerToken || 4,
      specialCharWeight: options?.specialCharWeight || 1.2,
      numberWeight: options?.numberWeight || 0.8,
      whitespaceWeight: options?.whitespaceWeight || 0.5,
      maxTokens: options?.maxTokens || 8192,
      safetyMargin: options?.safetyMargin || 0.1
    }
  }

  /**
   * Schätzt die Anzahl der Tokens in einem Text
   */
  estimateTokenCount(text: string): number {
    // Bereinige den Text
    const cleanedText = text.replace(/\s+/g, ' ').trim()
    
    // Zähle verschiedene Zeichentypen
    const specialChars = (cleanedText.match(/[^a-zA-Z0-9\s]/g) || []).length
    const numbers = (cleanedText.match(/\d+/g) || []).join('').length
    const whitespace = (cleanedText.match(/\s/g) || []).length
    const normalChars = cleanedText.length - specialChars - numbers - whitespace

    // Gewichtete Berechnung
    const weightedCount = 
      normalChars / this.options.avgCharsPerToken +
      specialChars * this.options.specialCharWeight +
      numbers * this.options.numberWeight +
      whitespace * this.options.whitespaceWeight

    const estimatedTokens = Math.ceil(weightedCount)
    
    this.logger.debug(`Token-Schätzung für Text (${cleanedText.length} Zeichen):`, {
      estimatedTokens,
      normalChars,
      specialChars,
      numbers,
      whitespace
    })

    return estimatedTokens
  }

  /**
   * Prüft, ob ein Text das Token-Limit überschreitet
   */
  exceedsLimit(text: string): boolean {
    const estimatedTokens = this.estimateTokenCount(text)
    const maxAllowedTokens = Math.floor(
      this.options.maxTokens * (1 - this.options.safetyMargin)
    )
    
    const exceeds = estimatedTokens > maxAllowedTokens
    if (exceeds) {
      this.logger.warn(
        `Token-Limit überschritten: ${estimatedTokens} > ${maxAllowedTokens}`,
        { text: text.substring(0, 100) + '...' }
      )
    }
    
    return exceeds
  }

  /**
   * Berechnet die optimale Chunk-Größe für einen Text
   */
  calculateOptimalChunkSize(text: string): number {
    const totalTokens = this.estimateTokenCount(text)
    const maxTokensPerChunk = Math.floor(
      this.options.maxTokens * (1 - this.options.safetyMargin)
    )
    
    const minChunks = Math.ceil(totalTokens / maxTokensPerChunk)
    const optimalChunkSize = Math.floor(text.length / minChunks)
    
    this.logger.debug('Optimale Chunk-Größe berechnet:', {
      totalTokens,
      maxTokensPerChunk,
      minChunks,
      optimalChunkSize
    })
    
    return optimalChunkSize
  }

  /**
   * Gibt die aktuellen Estimator-Einstellungen zurück
   */
  getSettings(): Required<TokenEstimatorOptions> {
    return { ...this.options }
  }
} 