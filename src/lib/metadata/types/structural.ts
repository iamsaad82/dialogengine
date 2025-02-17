/**
 * Strukturelles Element für die Verarbeitung von Inhalten
 */
export type StructuralElementType = 
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'table'
  | 'quote'
  | 'code'
  | 'image'

export interface BaseStructuralElement {
  type: StructuralElementType
  content: string
}

export interface HeadingElement extends BaseStructuralElement {
  type: 'heading'
  level: 1 | 2 | 3 | 4 | 5 | 6
}

export interface ParagraphElement extends BaseStructuralElement {
  type: 'paragraph'
}

export interface ListElement extends BaseStructuralElement {
  type: 'list'
  items: string[]
  ordered?: boolean
}

export interface TableElement extends BaseStructuralElement {
  type: 'table'
  headers?: string[]
  rows: string[][]
}

export interface QuoteElement extends BaseStructuralElement {
  type: 'quote'
  author?: string
}

export interface CodeElement extends BaseStructuralElement {
  type: 'code'
  language?: string
}

export interface ImageElement extends BaseStructuralElement {
  type: 'image'
  alt?: string
  url: string
}

export type StructuralElement =
  | HeadingElement
  | ParagraphElement
  | ListElement
  | TableElement
  | QuoteElement
  | CodeElement
  | ImageElement

/**
 * Type Guard für strukturelle Elemente
 */
export function isStructuralElement(element: any): element is StructuralElement {
  return (
    element &&
    typeof element.type === 'string' &&
    (typeof element.content === 'string' || Array.isArray(element.content))
  )
} 