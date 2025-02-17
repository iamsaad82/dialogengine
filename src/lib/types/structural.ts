/**
 * Basis-Interface für strukturelle Elemente
 */
export type ElementType = 'section' | 'list' | 'table' | 'xml'

export interface BaseElement {
  type: ElementType
  content?: string
  attributes?: Record<string, string>
  children?: StructuralElement[]
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
  type: 'section'
  title?: string
}

export interface XmlElement extends BaseElement {
  type: 'xml'
  tagName: string
}

/**
 * Union-Typ für alle strukturellen Elemente
 */
export type StructuralElement = SectionElement | ListElement | TableElement | XmlElement 