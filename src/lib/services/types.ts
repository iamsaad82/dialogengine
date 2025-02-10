export interface PineconeMetadata {
  url?: string
  title?: string
  templateId?: string
  contentType?: string
  language?: string
  lastModified?: string
  description?: string
  content?: string
  buttonText?: string
  phone?: string
  email?: string
  address?: string
  [key: string]: any
}

export interface SearchResult {
  text: string
  score: number
  metadata: PineconeMetadata
} 