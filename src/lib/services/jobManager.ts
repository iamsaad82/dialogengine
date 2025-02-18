import { Redis } from 'ioredis'
import { BatchJob, JobProgress, JobPhase, JobError, JobUpdate } from '../types/jobs'
import { nanoid } from 'nanoid'
import { getRedisInstance, isRedisEnabled } from '../redis'

export class JobManager {
  private redis: Redis
  private readonly keyPrefix = 'jobs:'

  constructor() {
    if (!isRedisEnabled()) {
      throw new Error('Redis ist nicht aktiviert')
    }
    
    this.redis = getRedisInstance()
  }

  private getJobKey(jobId: string): string {
    return `${this.keyPrefix}${jobId}`
  }

  async createJob(templateId: string, files: string[]): Promise<BatchJob> {
    const job: BatchJob = {
      id: nanoid(),
      templateId,
      files,
      status: {
        phase: 'queued',
        totalFiles: files.length,
        processedFiles: 0,
        progress: 0,
        startedAt: new Date(),
        updatedAt: new Date(),
        errors: []
      },
      createdAt: new Date()
    }

    await this.redis.set(
      this.getJobKey(job.id),
      JSON.stringify(job),
      'EX',
      60 * 60 * 24 // 24 Stunden TTL
    )

    return job
  }

  async getJob(jobId: string): Promise<BatchJob | null> {
    console.log('[JobManager] Hole Job:', jobId)
    const key = this.getJobKey(jobId)
    const jobData = await this.redis.get(key)
    if (!jobData) {
      console.log('[JobManager] Job nicht gefunden:', jobId)
      return null
    }
    const job = JSON.parse(jobData)
    console.log('[JobManager] Job gefunden:', job.status)
    return job
  }

  async updateJob(update: JobUpdate): Promise<BatchJob> {
    console.log('[JobManager] Update-Anfrage erhalten:', {
      jobId: update.jobId,
      phase: update.phase,
      progress: update.progress
    })

    // Validiere die Update-Daten
    if (!update.jobId || !update.phase) {
      throw new Error('Ungültige Update-Daten')
    }

    const job = await this.getJob(update.jobId)
    if (!job) {
      console.error('[JobManager] Job nicht gefunden:', update.jobId)
      throw new Error('Job nicht gefunden')
    }

    console.log('[JobManager] Aktueller Job-Status:', {
      phase: job.status.phase,
      progress: job.status.progress
    })
    
    const updatedJob: BatchJob = {
      ...job,
      status: {
        ...job.status,
        phase: update.phase,
        progress: update.progress,
        currentFile: update.currentFile,
        processedFiles: update.phase === 'completed' ? job.files.length : job.status.processedFiles,
        updatedAt: new Date(),
        errors: update.error 
          ? [...job.status.errors, update.error]
          : job.status.errors
      },
      completedAt: update.phase === 'completed' ? new Date() : job.completedAt
    }

    const key = this.getJobKey(job.id)
    
    // Maximal 3 Versuche für das Speichern
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[JobManager] Speicherversuch ${attempt} für Job:`, key)
        
        await this.redis.set(
          key,
          JSON.stringify(updatedJob),
          'EX',
          60 * 60 * 24
        )
        
        // Verifiziere das Update
        const savedJob = await this.getJob(update.jobId)
        if (!savedJob || savedJob.status.phase !== update.phase) {
          if (attempt === 3) {
            throw new Error('Status-Update konnte nicht verifiziert werden')
          }
          console.warn(`[JobManager] Verifizierung fehlgeschlagen, Versuch ${attempt}`)
          await new Promise(resolve => setTimeout(resolve, 100 * attempt))
          continue
        }
        
        console.log('[JobManager] Job erfolgreich aktualisiert:', {
          jobId: savedJob.id,
          phase: savedJob.status.phase,
          progress: savedJob.status.progress
        })
        
        return updatedJob
      } catch (error) {
        if (attempt === 3) {
          console.error('[JobManager] Alle Speicherversuche fehlgeschlagen:', error)
          throw error
        }
        console.warn(`[JobManager] Speicherversuch ${attempt} fehlgeschlagen:`, error)
        await new Promise(resolve => setTimeout(resolve, 100 * attempt))
      }
    }

    throw new Error('Unerwarteter Fehler beim Speichern des Jobs')
  }

  async listJobs(templateId: string): Promise<BatchJob[]> {
    const keys = await this.redis.keys(`${this.keyPrefix}*`)
    const jobs: BatchJob[] = []

    for (const key of keys) {
      const jobData = await this.redis.get(key)
      if (jobData) {
        const job = JSON.parse(jobData) as BatchJob
        if (job.templateId === templateId) {
          jobs.push(job)
        }
      }
    }

    return jobs.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  async deleteJob(jobId: string): Promise<void> {
    await this.redis.del(this.getJobKey(jobId))
  }
} 