/**
 * Basis-Interface für strukturelle Elemente
 */
export type ElementType = 'heading' | 'paragraph' | 'list' | 'table' | 'image' | 'code' | 'quote'

export interface BaseElement {
  type: ElementType
  content: string
  level?: number
  children?: StructuralElement[]
  metadata?: {
    id?: string
    class?: string
    style?: string
    [key: string]: unknown
  }
}

/**
 * Listen-Element
 */
export interface ListElement extends BaseElement {
  type: 'list'
  items?: string[]
}

/**
 * Tabellen-Element
 */
export interface TableElement extends BaseElement {
  type: 'table'
  headers?: string[]
  rows?: string[][]
}

/**
 * Abschnitts-Element
 */
export interface SectionElement extends BaseElement {
  type: 'heading'
  title?: string
}

export interface XmlElement extends BaseElement {
  type: 'code'
  tagName: string
}

/**
 * Union-Typ für alle strukturellen Elemente
 */
export type StructuralElement = SectionElement | ListElement | TableElement | XmlElement 