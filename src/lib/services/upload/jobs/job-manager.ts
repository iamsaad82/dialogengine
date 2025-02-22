import { Logger } from '@/lib/utils/logger'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'
import type { 
  UploadJob, 
  UploadJobStatus, 
  UploadJobMetadata 
} from '@/lib/types/upload'

export class JobManager {
  private logger: Logger

  constructor() {
    this.logger = new Logger('JobManager')
  }

  /**
   * Erstellt einen neuen Upload-Job
   */
  public async createJob(templateId: string, files: File[]): Promise<string> {
    const jobId = nanoid()
    
    await prisma.uploadJob.create({
      data: {
        id: jobId,
        templateId,
        status: 'uploading',
        totalFiles: files.length,
        processedFiles: 0,
        metadata: {
          fileNames: files.map(f => f.name),
          sizes: files.map(f => f.size),
          types: files.map(f => f.type),
          startTime: new Date().toISOString(),
          totalFiles: files.length,
          currentOperation: 'Initialisiere Verarbeitung',
          processingDetails: {
            stage: 'start',
            message: 'Starte Verarbeitung',
            estimatedTimeRemaining: `${files.length * 2} Minuten`
          }
        }
      }
    })

    this.logger.info(`Upload-Job ${jobId} erstellt für Template ${templateId}`)
    return jobId
  }

  /**
   * Aktualisiert den Status eines Jobs
   */
  public async updateJobStatus(
    jobId: string, 
    status: UploadJobStatus,
    metadata: Partial<UploadJobMetadata>
  ): Promise<void> {
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        status,
        metadata: {
          ...metadata,
          lastUpdateTime: new Date().toISOString()
        }
      }
    })

    this.logger.info(`Job ${jobId} Status aktualisiert: ${status}`)
  }

  /**
   * Aktualisiert den Fortschritt eines Jobs
   */
  public async updateJobProgress(
    jobId: string,
    processedFiles: number,
    metadata: Partial<UploadJobMetadata>
  ): Promise<void> {
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        processedFiles,
        metadata: {
          ...metadata,
          lastUpdateTime: new Date().toISOString()
        }
      }
    })

    this.logger.info(`Job ${jobId} Fortschritt aktualisiert: ${processedFiles} Dateien verarbeitet`)
  }

  /**
   * Markiert einen Job als abgeschlossen
   */
  public async completeJob(
    jobId: string,
    metadata: Partial<UploadJobMetadata>
  ): Promise<void> {
    const endTime = new Date()
    
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        metadata: {
          ...metadata,
          completionTime: endTime.toISOString(),
          processingDetails: {
            stage: 'completed',
            message: 'Alle Dateien erfolgreich verarbeitet'
          },
          currentOperation: 'Verarbeitung abgeschlossen'
        }
      }
    })

    this.logger.info(`Job ${jobId} erfolgreich abgeschlossen`)
  }

  /**
   * Markiert einen Job als fehlgeschlagen
   */
  public async failJob(
    jobId: string,
    error: Error,
    metadata?: Partial<UploadJobMetadata>
  ): Promise<void> {
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        status: 'error',
        metadata: {
          ...metadata,
          error: error.message,
          errorTime: new Date().toISOString(),
          errorDetails: error.stack,
          processingDetails: {
            stage: 'error',
            message: 'Kritischer Fehler bei der Verarbeitung'
          }
        }
      }
    })

    this.logger.error(`Job ${jobId} fehlgeschlagen:`, error)
  }

  /**
   * Bricht einen Job ab
   */
  public async cancelJob(jobId: string): Promise<void> {
    await prisma.uploadJob.update({
      where: { id: jobId },
      data: {
        status: 'cancelled',
        metadata: {
          cancelledAt: new Date().toISOString(),
          processingDetails: {
            stage: 'cancelled',
            message: 'Upload-Vorgang wurde manuell abgebrochen'
          }
        }
      }
    })

    this.logger.info(`Job ${jobId} wurde abgebrochen`)
  }

  /**
   * Lädt den Status eines Jobs
   */
  public async getJobStatus(jobId: string): Promise<{
    stage: string
    progress: number
    message: string
    details: any
  }> {
    const job = await prisma.uploadJob.findUnique({
      where: { id: jobId }
    })

    if (!job) {
      throw new Error('Job nicht gefunden')
    }

    const progress = (job.processedFiles / job.totalFiles) * 100

    return {
      stage: job.status,
      progress,
      message: this.getStatusMessage(job.status),
      details: job.metadata
    }
  }

  /**
   * Generiert eine Statusmeldung
   */
  private getStatusMessage(status: string): string {
    switch (status) {
      case 'uploading':
        return 'Dateien werden hochgeladen...'
      case 'processing':
        return 'Dateien werden verarbeitet...'
      case 'analyzing':
        return 'Inhalte werden analysiert...'
      case 'indexing':
        return 'Vektoren werden erstellt...'
      case 'completed':
        return 'Upload abgeschlossen'
      case 'error':
        return 'Fehler beim Upload'
      case 'cancelled':
        return 'Upload wurde abgebrochen'
      default:
        return 'Unbekannter Status'
    }
  }
} 