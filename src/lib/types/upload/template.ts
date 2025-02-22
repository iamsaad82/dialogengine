export interface TemplateMetadata {
  name: string
  description?: string
  version: number
  lastModified: string
  author?: string
  tags?: string[]
  status?: 'draft' | 'active' | 'archived'
  settings?: {
    [key: string]: any
  }
}

export interface TemplateConfig {
  handlers?: string[]
  schemas?: string[]
  layouts?: string[]
  settings?: {
    [key: string]: any
  }
}

export interface Template {
  id: string
  name: string
  description?: string
  metadata: TemplateMetadata
  config: TemplateConfig
} 