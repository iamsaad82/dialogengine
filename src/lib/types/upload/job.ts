import type { VectorResult } from './index'

export interface ProcessingDetails {
  stage: 'start' | 'extraction' | 'analysis' | 'processing' | 'handler_generation' | 'vectorization' | 'error' | 'completed' | 'cancelled'
  message: string
  currentOperation?: string
  progress?: number
  subStage?: string
  step?: number
  totalSteps?: number
  estimatedTimeRemaining?: string
}

export interface UploadJobMetadata {
  startTime: string
  totalFiles: number
  currentOperation?: string
  processingDetails?: ProcessingDetails
  lastProcessedFile?: string
  lastUpdateTime?: string
  completionTime?: string
  error?: string
  errorDetails?: string
  errorFile?: string
  errorTime?: string
  vectorCount?: number
  vectorMetadata?: any
  handlerIds?: string[]
  fileNames?: string[]
  sizes?: number[]
  types?: string[]
  cancelledAt?: string
  finalStats?: {
    totalFiles: number
    totalProcessingTime: number
    averageVectorCount: number
    totalVectors: number
  }
}

export type UploadJobStatus = 'pending' | 'processing' | 'completed' | 'error' | 'cancelled'

export interface UploadJob {
  id: string
  status: UploadJobStatus
  metadata: UploadJobMetadata
  createdAt: Date
  updatedAt: Date
}

// Re-export für einfacheren Zugriff
export type { VectorResult } 