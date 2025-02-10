// Basis Cheerio-Typen
export interface CheerioAPI {
  (selector: string | CheerioElement | CheerioSelector): CheerioSelector
  load: (html: string) => CheerioAPI
  html: () => string | null
  text: () => string
  find: (selector: string) => CheerioSelector
  map: <T>(callback: (this: CheerioElement, index: number, element: CheerioElement) => T) => T[]
  each: (callback: (this: CheerioElement, index: number, element: CheerioElement) => void) => CheerioSelector
  attr: (name: string) => string | undefined
  first: () => CheerioSelector
  last: () => CheerioSelector
  // Root-spezifische Methoden
  root: () => CheerioSelector
  contains: (element: CheerioElement) => boolean
  parseHTML: (html: string) => CheerioElement[]
  // Zusätzliche Selektormethoden
  is: (selector: string | CheerioElement | CheerioSelector | ((this: CheerioElement, index: number, element: CheerioElement) => boolean)) => boolean
  filter: (selector: string | CheerioElement | CheerioSelector | ((this: CheerioElement, index: number, element: CheerioElement) => boolean)) => CheerioSelector
  not: (selector: string | CheerioElement | CheerioSelector | ((this: CheerioElement, index: number, element: CheerioElement) => boolean)) => CheerioSelector
  // jQuery-ähnliche Methoden
  prop: (name: string) => any
  data: (key?: string) => any
  addClass: (className: string) => CheerioSelector
  removeClass: (className: string) => CheerioSelector
  toggleClass: (className: string) => CheerioSelector
  hasClass: (className: string) => boolean
  val: () => string | undefined
  removeAttr: (name: string) => CheerioSelector
  parent: () => CheerioSelector
  children: (selector?: string) => CheerioSelector
  siblings: (selector?: string) => CheerioSelector
  next: (selector?: string) => CheerioSelector
  prev: (selector?: string) => CheerioSelector
  closest: (selector: string) => CheerioSelector
}

export interface CheerioElement {
  type: 'tag' | 'text' | 'comment' | 'script' | 'style' | 'directive'
  name: string
  attribs: { [key: string]: string }
  children?: CheerioElement[]
  data?: string
  parent?: CheerioElement
  prev?: CheerioElement
  next?: CheerioElement
  nodeValue?: string
  startIndex?: number
  endIndex?: number
  // Zusätzliche Eigenschaften
  tagName?: string
  namespace?: string
  x?: string
  sourceCodeLocation?: {
    startLine: number
    startCol: number
    startOffset: number
    endLine: number
    endCol: number
    endOffset: number
  }
}

export interface CheerioSelector {
  length: number
  // Basis-Methoden
  attr: (name: string) => string | undefined
  find: (selector: string) => CheerioSelector
  first: () => CheerioSelector
  last: () => CheerioSelector
  text: () => string
  html: () => string | null
  toString: () => string
  
  // Traversierung
  parent: () => CheerioSelector
  parents: (selector?: string) => CheerioSelector
  children: (selector?: string) => CheerioSelector
  siblings: (selector?: string) => CheerioSelector
  next: (selector?: string) => CheerioSelector
  nextAll: (selector?: string) => CheerioSelector
  prev: (selector?: string) => CheerioSelector
  prevAll: (selector?: string) => CheerioSelector
  closest: (selector: string) => CheerioSelector
  
  // Manipulation
  append: (content: string | CheerioElement | CheerioSelector) => CheerioSelector
  prepend: (content: string | CheerioElement | CheerioSelector) => CheerioSelector
  remove: () => CheerioSelector
  replaceWith: (content: string | CheerioElement | CheerioSelector) => CheerioSelector
  empty: () => CheerioSelector
  
  // Iteration
  each: (callback: CheerioCallback) => CheerioSelector
  map: <T>(callback: CheerioMapCallback<T>) => T[]
  filter: (selector: string | CheerioElement | CheerioSelector | CheerioFilterCallback) => CheerioSelector
  not: (selector: string | CheerioElement | CheerioSelector | CheerioFilterCallback) => CheerioSelector
  
  // Utility
  get: () => CheerioElement[]
  toArray: () => CheerioElement[]
  index: (selector?: string | CheerioElement | CheerioSelector) => number
  is: (selector: string | CheerioElement | CheerioSelector | CheerioFilterCallback) => boolean
  
  // Klassen
  hasClass: (className: string) => boolean
  addClass: (className: string) => CheerioSelector
  removeClass: (className: string) => CheerioSelector
  toggleClass: (className: string) => CheerioSelector
  
  // Daten
  data: (key?: string) => any
  removeData: (key?: string) => CheerioSelector
  
  // Form-Elemente
  val: () => string | undefined
  prop: (name: string) => any
  
  // Events (nur für Kompatibilität)
  on: (event: string, handler: Function) => CheerioSelector
  off: (event?: string, handler?: Function) => CheerioSelector
}

// Callback-Typen
export type CheerioCallback = (this: CheerioElement, index: number, element: CheerioElement) => void
export type CheerioMapCallback<T> = (this: CheerioElement, index: number, element: CheerioElement) => T
export type CheerioFilterCallback = (this: CheerioElement, index: number, element: CheerioElement) => boolean

// Hilfsfunktionen für Typ-Checks
export const isCheerioElement = (element: unknown): element is CheerioElement => {
  return element !== null && 
         typeof element === 'object' && 
         'type' in element && 
         ('data' in element || 'children' in element)
}

export const isCheerioSelector = (selector: unknown): selector is CheerioSelector => {
  return selector !== null && 
         typeof selector === 'object' && 
         selector !== undefined &&
         'length' in selector && 
         'find' in selector
}

// Zusätzliche Hilfsfunktionen
export const isTextNode = (element: CheerioElement): boolean => {
  return element.type === 'text'
}

export const isTagNode = (element: CheerioElement): boolean => {
  return element.type === 'tag'
}

export const hasChildren = (element: CheerioElement): boolean => {
  return Array.isArray(element.children) && element.children.length > 0
}

export const getAttributeValue = (element: CheerioElement, attributeName: string): string | undefined => {
  return element.attribs?.[attributeName]
}

// Type Guards für spezifische HTML-Elemente
export const isFormElement = (element: CheerioElement): boolean => {
  return element.type === 'tag' && element.name === 'form'
}

export const isInputElement = (element: CheerioElement): boolean => {
  return element.type === 'tag' && element.name === 'input'
}

export const isButtonElement = (element: CheerioElement): boolean => {
  return element.type === 'tag' && (element.name === 'button' || 
         (element.name === 'input' && getAttributeValue(element, 'type') === 'button'))
}

// Konvertierungsfunktionen
export const cheerioToJQuery = <T extends CheerioElement>(element: T): JQuery<Element> => {
  throw new Error('Cheerio zu jQuery Konvertierung ist nicht implementiert')
}

export const jQueryToCheerio = <T extends Element>(element: JQuery<T>): CheerioSelector => {
  throw new Error('jQuery zu Cheerio Konvertierung ist nicht implementiert')
} 