export type InteractiveElementType = 'link' | 'button' | 'form' | 'download' | 'contact';

export interface InteractiveElement {
  type: InteractiveElementType
  text: string
  action: string
  priority: number
}

export interface DocumentMetadata {
  id: string
  type: string
  title: string
  language: string
  source: string
  lastModified: string
  templateId: string
  templateMetadata: Record<string, any>
  actions: Array<{
    type: InteractiveElementType
    label: string
    url: string
    priority: number
  }>
  hasImages: boolean
  contactPoints: Array<{
    type: string
    value: string
    description?: string
  }>
  relatedTopics: string[]
}

export interface SearchResult {
  id: string
  score: number
  metadata: DocumentMetadata
} 