import { ContentMetadata, ContentType } from './contentTypes'

export interface ScannerConfig {
  openaiApiKey: string
  pineconeApiKey: string
  pineconeEnvironment: string
  pineconeHost?: string
  pineconeIndex: string
  redisUrl?: string
  templateId: string
}

export type ScanStatus = 'pending' | 'scanning' | 'vectorizing' | 'completed' | 'error'

export interface ScanProgress {
  status: ScanStatus
  current: number
  total: number
  error?: string
}

export interface PageMetadata extends ContentMetadata {
  type?: ContentType
  lastModified?: string
  fileType?: string
  fileUrl?: string
  interactions?: {
    forms?: Array<{
      id: string
      fields: Array<{
        name: string
        type: string
        required: boolean
        validation?: string
      }>
      action: string
      method: string
    }>
    buttons?: Array<{
      id: string
      text: string
      action: string
      type: 'submit' | 'link' | 'action'
    }>
    messages?: Array<{
      type: 'success' | 'error' | 'info'
      text: string
      selector: string
    }>
  }
}

export interface MenuItem {
  title: string
  url: string
  children?: MenuItem[]
  type?: 'internal' | 'external' | 'download'
  icon?: string
  description?: string
  isActive?: boolean
  attributes?: {
    target?: '_blank' | '_self'
    rel?: string
    class?: string
    id?: string
    [key: string]: string | undefined
  }
}

export interface NavigationStructure {
  mainMenu: MenuItem[]
  subMenus: Record<string, {
    id: string
    title?: string
    description?: string
    items: MenuItem[]
    position?: 'header' | 'footer' | 'sidebar'
  }>
  breadcrumbs: Record<string, {
    path: string[]
    urls?: string[]
    current: string
    schema?: {
      '@type': 'BreadcrumbList'
      itemListElement: Array<{
        '@type': 'ListItem'
        position: number
        name: string
        item: string
      }>
    }
  }>
  meta: {
    currentPath?: string[]
    activeSection?: string
    lastUpdated?: string
    language?: string
  }
}

export interface Action {
  type: 'link' | 'form' | 'download' | 'login'
  target: string
  method?: 'GET' | 'POST'
  requiredFields?: Array<{
    name: string
    type: string
    required: boolean
    validation?: string
  }>
  successIndicator?: string
  stepId?: number
}

export interface WebsiteStructure {
  pages: Array<{
    url: string
    type?: string
    metadata?: PageMetadata
  }>
  navigation: NavigationStructure
  processes: Array<{
    id: string
    name: string
    steps: Array<{
      id: string
      url: string
      title: string
      requiredInputs: string[]
      nextSteps: string[]
      actions: Action[]
    }>
  }>
  meta?: {
    lastScanned?: string
    totalPages?: number
    contentTypes?: Record<string, number>
    errors?: Array<{
      url: string
      type: string
      message: string
    }>
  }
} 