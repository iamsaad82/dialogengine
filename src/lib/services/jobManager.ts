import { Redis } from 'ioredis'
import { BatchJob, JobProgress, JobPhase, JobError, JobUpdate } from '../types/jobs'
import { nanoid } from 'nanoid'

export class JobManager {
  private redis: Redis
  private readonly keyPrefix = 'jobs:'

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null
        return Math.min(times * 1000, 3000)
      }
    })
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
    const jobData = await this.redis.get(this.getJobKey(jobId))
    if (!jobData) return null
    return JSON.parse(jobData)
  }

  async updateJob(update: JobUpdate): Promise<BatchJob> {
    const job = await this.getJob(update.jobId)
    if (!job) throw new Error('Job nicht gefunden')

    const updatedJob: BatchJob = {
      ...job,
      status: {
        ...job.status,
        phase: update.phase,
        progress: update.progress,
        currentFile: update.currentFile,
        updatedAt: new Date(),
        errors: update.error 
          ? [...job.status.errors, update.error]
          : job.status.errors
      }
    }

    if (update.phase === 'completed') {
      updatedJob.completedAt = new Date()
    }

    await this.redis.set(
      this.getJobKey(job.id),
      JSON.stringify(updatedJob),
      'EX',
      60 * 60 * 24
    )

    return updatedJob
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