export * from './content'
export * from './config'
export * from './template'

// Re-export benötigte Typen aus contentTypes
export type { ContentType, ContentMetadata } from '@/lib/types/contentTypes'
export { ContentTypeEnum } from '@/lib/types/contentTypes'

export interface SearchContext {
  query: string
  history?: Array<{ role: string, content: string }>
  templateId?: string
  metadata?: {
    previousContext?: any
    history?: Array<{ role: string, content: string }>
    [key: string]: any
  }
} 