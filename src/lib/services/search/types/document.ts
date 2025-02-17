import { ContentType } from '../types'

export interface DocumentMetadata {
  content: string
  type: ContentType
  title?: string
  url?: string
  language?: string
  lastModified?: string
  vectorizedAt?: string
  templateId?: string
  [key: string]: any
} 