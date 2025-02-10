import { ContentType } from '@/lib/types/contentTypes'

export interface ResponseTemplate {
  type: ContentType
  template: string
  labels?: {
    title?: string
    description?: string
    requirements?: string
    costs?: string
    coverage?: string
    actions?: string
    sources?: string
  }
}

export interface TemplateVariables {
  query: string
  context: string
  metadata: {
    title?: string
    description?: string
    requirements?: string[]
    costs?: {
      amount: number
      currency: string
      period?: string
      details?: string[]
    }
    coverage?: {
      included: string[]
      excluded: string[]
      conditions: string[]
    }
    actions?: Array<{
      type: 'link' | 'form' | 'download' | 'contact'
      label: string
      url: string
      priority: number
    }>
    sources?: Array<{
      url: string
      title: string
      snippets?: Array<{
        text: string
        score: number
      }>
    }>
  }
} 