export interface XMLParserOptions {
  ignoreAttributes: boolean
  parseAttributeValue: boolean
  allowBooleanAttributes: boolean
  isArray: (name: string, jpath: string, isLeafNode: boolean, isAttribute: boolean) => boolean
  parseTagValue?: boolean
  trimValues?: boolean
}

export type XMLPrimitive = string | number | boolean | null
export type XMLValue = XMLPrimitive | { [key: string]: XMLValue } | XMLValue[]

export interface ContentProcessorOptions {
  chunkSize?: number
  maxFileSize?: number
} 