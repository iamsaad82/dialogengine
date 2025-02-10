import { CheerioAPI, CheerioSelector, CheerioElement } from '../../types/cheerio'
import { MenuItem, Action } from '../../types/scanner'
import { ContentType, ContentMetadata } from '../../types/contentTypes'

export interface ExtractorResult<T> {
  success: boolean
  data?: T
  error?: string
}

export interface ProcessStep {
  id: string
  title: string
  description: string
  order: number
  url: string
  requiredInputs: string[]
  nextSteps: string[]
  actions: Action[]
}

export interface FormInfo {
  id: string
  fields: Array<{
    name: string
    type: string
    required: boolean
    validation?: string
  }>
  action: string
  method: string
}

export interface ButtonInfo {
  id: string
  text: string
  action: string
  type: 'link' | 'submit' | 'action'
}

export interface MessageInfo {
  type: 'success' | 'error' | 'info'
  text: string
  selector: string
}

export interface NavigationExtractor {
  extractMainMenu($: CheerioAPI): Promise<ExtractorResult<MenuItem[]>>
  extractSubMenus($: CheerioAPI): Promise<ExtractorResult<Record<string, {
    id: string
    title?: string
    description?: string
    items: MenuItem[]
    position?: 'header' | 'footer' | 'sidebar'
  }>>>
  extractBreadcrumbs($: CheerioAPI): Promise<ExtractorResult<Record<string, {
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
  }>>>
  
  // Neue Methoden für erweiterte Navigation
  detectNavigationType?($: CheerioAPI): Promise<ExtractorResult<{
    type: 'standard' | 'mega-menu' | 'sidebar' | 'hamburger'
    features: string[]
  }>>
  extractMetaNavigation?($: CheerioAPI): Promise<ExtractorResult<{
    language?: string
    search?: {
      enabled: boolean
      placeholder?: string
      action?: string
    }
    social?: Array<{
      platform: string
      url: string
      icon?: string
    }>
  }>>
}

export interface ProcessExtractor {
  extractProcessSteps($: CheerioAPI): Promise<ExtractorResult<ProcessStep[]>>
  extractProcessActions($: CheerioAPI): Promise<ExtractorResult<Action[]>>
  analyzeProcess(url: string): Promise<ExtractorResult<{
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
  }>>
}

export interface FormExtractor {
  extractForms($: CheerioAPI): Promise<ExtractorResult<FormInfo[]>>
  extractButtons($: CheerioAPI): Promise<ExtractorResult<ButtonInfo[]>>
  extractMessages($: CheerioAPI): Promise<ExtractorResult<MessageInfo[]>>
}

export interface ContentExtractor {
  extractContent(html: string): ExtractorResult<{ 
    title: string
    content: string 
  }>
  extractTitle(content: string): string
  cleanMarkdown(content: string): string
  determineType(content: string): ContentType
  determineContentType(content: string): ContentType
}

export type ScanStatus = 'pending' | 'scanning' | 'vectorizing' | 'completed' | 'error'

export interface ScanProgress {
  status: ScanStatus
  current: number
  total: number
  error?: string
}

export interface ScanOptions {
  recursive?: boolean
  maxDepth?: number
  includePatterns?: string[]
  excludePatterns?: string[]
}

export interface WebsiteScanOptions extends ScanOptions {
  scanSubpages?: boolean
}

export interface MarkdownScanOptions extends ScanOptions {
  recursive?: boolean
} 