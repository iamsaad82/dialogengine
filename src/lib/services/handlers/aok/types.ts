import { ContentType, ContentMetadata } from '../../../types/contentTypes'

export interface AOKHandlerResponse {
  type: string
  text: string
  metadata: ContentMetadata
}

export interface AOKBaseHandler {
  canHandle(query: string): boolean
  handleQuery(query: string): Promise<AOKHandlerResponse>
}

export const AOK_TOPICS = {
  NUTRITION: 'nutrition',
  DENTAL: 'dental',
  THERAPY: 'therapy',
  CANCER_PREVENTION: 'cancer_prevention',
  MEDICAL_TREATMENT: 'medical_treatment',
  REHABILITATION: 'rehabilitation',
  FAMILY: 'family',
  VISION_HEARING: 'vision_hearing',
  SPORTS: 'sports'
} as const

export type AOKTopic = typeof AOK_TOPICS[keyof typeof AOK_TOPICS] 