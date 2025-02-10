import { z } from 'zod'

// Content-Type Enum
export const ContentTypeEnum = {
  // Informative Inhalte
  INFO: 'info',
  SERVICE: 'service',
  PRODUCT: 'product',
  EVENT: 'event',
  
  // Orte und Kontakte
  LOCATION: 'location',
  CONTACT: 'contact',
  
  // Medien und Ressourcen
  VIDEO: 'video',
  DOWNLOAD: 'download',
  LINK: 'link',
  
  // Spezielle Inhalte
  FAQ: 'faq',
  MEDICAL: 'medical',
  INSURANCE: 'insurance',
  
  // Navigation und Prozesse
  NAVIGATION: 'navigation',
  PROCESS: 'process',
  FORM: 'form',
  
  // System und Status
  ERROR: 'error',
  WAIT: 'wait'
} as const

export type ContentType = typeof ContentTypeEnum[keyof typeof ContentTypeEnum]

// Zod Schema für Content-Type Validierung
export const contentTypeSchema = z.enum([
  'info',
  'service',
  'product',
  'event',
  'location',
  'video',
  'link',
  'contact',
  'faq',
  'download',
  'medical',
  'insurance',
  'wait',
  'process',
  'form',
  'navigation'
])

// Metadata Interface für jeden Content-Type
export interface ContentMetadata {
  title?: string
  description?: string
  topics?: string[]
  type?: string
  context?: {
    isFollowUp?: boolean
    previousContext?: any
    aspects?: string[]
  }
  requirements?: string[]
  coverage?: {
    included?: string[]
    excluded?: string[]
    conditions?: string[]
  }
  [key: string]: any
}

// Interface für Content-Type-Erkennung
export type ContentTypeResult = {
  type: ContentType
  confidence: number
  metadata: ContentMetadata
}

// Content-Type-Error Interface
export type ContentTypeError = {
  type: 'error'
  error: string
}

// Utility-Funktionen
export const isValidContentType = (type: string): type is ContentType => {
  return Object.values(ContentTypeEnum).includes(type as ContentType)
}

export function getDefaultMetadata(type: ContentType): ContentMetadata {
  const baseMetadata: ContentMetadata = {
    title: '',
    description: ''
  }

  switch (type) {
    case ContentTypeEnum.LINK:
      return {
        ...baseMetadata,
        linkType: 'internal',
        targetUrl: '',
        noFollow: false,
        openInNewTab: false
      }
    case ContentTypeEnum.VIDEO:
      return {
        ...baseMetadata,
        videoType: 'youtube',
        videoId: '',
        duration: '',
        captions: false
      }
    case ContentTypeEnum.PRODUCT:
      return {
        ...baseMetadata,
        productId: '',
        price: {
          amount: 0,
          currency: 'EUR'
        },
        availability: 'in_stock'
      }
    case ContentTypeEnum.EVENT:
      return {
        ...baseMetadata,
        eventType: 'conference',
        startDate: new Date().toISOString(),
        location: {
          type: 'physical'
        }
      }
    case ContentTypeEnum.WAIT:
      return {
        ...baseMetadata,
        waitType: 'loading',
        waitDuration: 0,
        progressIndicator: true,
        cancelable: true
      }
    default:
      return baseMetadata
  }
} 