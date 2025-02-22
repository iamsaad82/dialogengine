export interface UploadOptions {
  maxTokens?: number
  avgCharsPerToken?: number
  overlapTokens?: number
  chunkSize?: number
  retryLimit?: number
  rateLimitDelay?: number
  minChunkSize?: number // Mindestgröße in Bytes für Chunking
} 