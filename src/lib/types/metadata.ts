export interface MetadataDefinition {
  key: string
  name: string
  type: string
  description: string
  required: boolean
  pattern?: string
  defaultValue?: any
  validation?: {
    minLength?: number
    maxLength?: number
    pattern?: string
    enum?: string[]
    custom?: (value: any) => boolean
  }
} 