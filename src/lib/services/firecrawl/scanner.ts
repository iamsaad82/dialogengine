import { FirecrawlConfig, CrawlOptions, CrawlStatus, DEFAULT_CRAWL_OPTIONS, CrawlResult } from './types'
import { FirecrawlClient } from './client'
import { JobManager } from './job-manager'
import { ContentProcessor } from './content-processor'
import { VectorStorage } from './vector-storage'
import { ContentTypeResult } from '../../types/contentTypes'

export class FirecrawlScanner {
  private client: FirecrawlClient
  private jobManager: JobManager
  private contentProcessor: ContentProcessor
  private vectorStorage: VectorStorage

  constructor(config: FirecrawlConfig) {
    this.client = new FirecrawlClient({
      firecrawlApiKey: config.firecrawlApiKey
    })

    this.jobManager = new JobManager(config.redisUrl)

    this.contentProcessor = new ContentProcessor(config.openaiApiKey)

    this.vectorStorage = new VectorStorage({
      openaiApiKey: config.openaiApiKey,
      pineconeApiKey: config.pineconeApiKey,
      pineconeEnvironment: config.pineconeEnvironment || 'gcp-starter',
      pineconeIndex: config.pineconeIndex || 'dialog-engine',
      pineconeHost: config.pineconeHost
    })
  }

  async startCrawl(url: string, templateId?: string, options: CrawlOptions = DEFAULT_CRAWL_OPTIONS): Promise<string> {
    console.log('Crawl-Job gestartet:', { url, templateId })
    
    const response = await this.client.startCrawl(url, templateId, options)
    const jobId = response.id

    this.jobManager.setJob(jobId, {
      status: 'running',
      pagesScanned: 0,
      totalPages: 0
    })

    return jobId
  }

  async checkStatus(jobId: string): Promise<CrawlStatus | null> {
    const status = await this.client.checkStatus(jobId)
    if (!status) return null

    const jobStatus: CrawlStatus = {
      status: status.status === 'completed' ? 'completed' : 'running',
      pagesScanned: status.completed,
      totalPages: status.total,
      data: status.data?.map(item => ({
        markdown: item.markdown,
        metadata: {
          url: item.metadata.url,
          title: item.metadata.title,
          scrapeId: item.metadata.scrapeId,
          viewport: item.metadata.viewport,
          sourceURL: item.metadata.sourceURL,
          statusCode: item.metadata.statusCode,
          templateId: item.metadata.templateId
        }
      }))
    }

    this.jobManager.setJob(jobId, jobStatus)
    return jobStatus
  }

  async processResults(jobId: string): Promise<ContentTypeResult[]> {
    const status = await this.checkStatus(jobId)
    if (!status || !status.data) {
      throw new Error('Keine Ergebnisse verfügbar')
    }

    const results: ContentTypeResult[] = []

    for (const item of status.data) {
      const result: CrawlResult = {
        markdown: item.markdown,
        metadata: {
          url: item.metadata.url,
          title: item.metadata.title,
          scrapeId: item.metadata.scrapeId,
          viewport: item.metadata.viewport,
          sourceURL: item.metadata.sourceURL,
          statusCode: item.metadata.statusCode,
          templateId: item.metadata.templateId
        }
      }

      // Verarbeite den Inhalt
      const processedResult = await this.contentProcessor.processCrawlResult(result)
      
      // Vektorisiere den Inhalt
      const vector = await this.vectorStorage.vectorize(result.markdown)
      
      // Speichere in Pinecone
      await this.vectorStorage.upsert(result.metadata.scrapeId, vector, {
        url: result.metadata.url,
        title: result.metadata.title,
        type: processedResult.type,
        ...processedResult.metadata
      })

      results.push(processedResult)
    }

    return results
  }

  async cancelCrawl(jobId: string): Promise<boolean> {
    const success = await this.client.cancelCrawl(jobId)
    if (success) {
      this.jobManager.deleteJob(jobId)
    }
    return success
  }

  async close(): Promise<void> {
    await this.jobManager.close()
  }
} 