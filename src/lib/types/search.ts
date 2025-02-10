export interface SearchResult {
  text: string
  score: number
  metadata: {
    url?: string
    title?: string
    contentType?: string
    templateId?: string
    text?: string
    content?: string
    [key: string]: any
  }
} 