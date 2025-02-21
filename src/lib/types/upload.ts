export interface UploadStatusDetails {
  currentOperation?: string
  detectedTypes?: Array<{
    type: string
    confidence: number
  }>
  processingDetails?: {
    stage: string
    subStage?: string
  }
  documentsProcessed?: number
  totalDocuments?: number
  error?: string
}

export interface UploadStatusType {
  stage: 'pending' | 'uploading' | 'processing' | 'analyzing' | 'indexing' | 'complete' | 'error'
  message: string
  progress: number
  details?: UploadStatusDetails
}

export type UploadStatus = UploadStatusType

export interface UploadJobMetadata {
  handlerId: string
  startTime: string
  lastProcessedFile?: string
  lastUpdateTime?: string
  completionTime?: string
  totalProcessed?: number
  error?: string
  errorTime?: string
}

export type UploadJobStatus = 'pending' | 'processing' | 'completed' | 'error' | 'cancelled'

export interface UploadJob {
  id: string
  templateId: string
  status: UploadJobStatus
  totalFiles: number
  processedFiles: number
  metadata: UploadJobMetadata
  createdAt: Date
  updatedAt: Date
} 