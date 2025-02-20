export type JobPhase = 
  | 'queued'      // Job wurde erstellt und wartet auf Verarbeitung
  | 'uploading'   // Dateien werden hochgeladen
  | 'scanning'    // Dateien werden gescannt
  | 'processing'  // Dateien werden verarbeitet
  | 'analyzing'   // Inhalte werden analysiert
  | 'indexing'    // Inhalte werden indiziert
  | 'completed'   // Job wurde erfolgreich abgeschlossen
  | 'error'       // Ein Fehler ist aufgetreten

export interface JobError {
  file: string
  message: string
  phase: JobPhase
  timestamp: Date
}

export interface JobProgress {
  phase: JobPhase
  totalFiles: number
  processedFiles: number
  progress: number
  currentFile?: string
  startedAt: Date
  updatedAt: Date
  errors: JobError[]
}

export interface BatchJob {
  id: string
  templateId: string
  files: string[]
  status: JobProgress
  createdAt: Date
  completedAt?: Date
}

export interface JobUpdate {
  jobId: string
  phase: JobPhase
  progress: number
  currentFile?: string
  details?: string
  message?: string
  error?: JobError
  startTime?: number
  estimatedTimeRemaining?: number
  processingSpeed?: number
}

export interface JobStatus {
  phase: JobPhase
  progress: number
  currentFile?: string
  errors: Array<{
    file: string
    message: string
    phase: JobPhase
    timestamp: Date
  }>
}

export interface JobMetadata {
  templateId: string
  files: string[]
  created: Date
  updated: Date
  status: JobStatus
}

// Gemeinsame Basis für alle Status-Updates
export interface BaseStatus {
  phase: JobPhase
  progress: number
  error?: string
  details?: string
}

// Status für Scan-Vorgänge
export interface ScanStatus extends BaseStatus {
  pagesScanned: number
  totalPages: number
  currentUrl?: string
}

// Status für Upload-Vorgänge
export interface UploadStatus extends BaseStatus {
  fileName: string
  jobId: string
  phase: JobPhase
  progress: number
  details?: string
  error?: string
  startTime?: number
  estimatedTimeRemaining?: number
  processingSpeed?: number
}

// Status für Vektorisierungs-Vorgänge
export interface VectorizationStatus extends BaseStatus {
  documentsProcessed: number
  totalDocuments: number
  currentDocument?: string
}

// Status für Content-Type-Erkennung
export interface ContentTypeStatus extends BaseStatus {
  detectedTypes: Array<{
    type: string
    confidence: number
    count: number
  }>
}

// Utility-Funktionen für Status-Updates
export const createInitialStatus = (type: 'scan' | 'upload' | 'vectorization' | 'contentType'): BaseStatus => {
  return {
    phase: 'queued',
    progress: 0
  }
}

export const isJobComplete = (status: BaseStatus): boolean => {
  return status.phase === 'completed'
}

export const isJobError = (status: BaseStatus): boolean => {
  return status.phase === 'error'
}

export const isJobActive = (status: BaseStatus): boolean => {
  return !isJobComplete(status) && !isJobError(status)
} 