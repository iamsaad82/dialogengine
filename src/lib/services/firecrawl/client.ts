import { FirecrawlConfig, FirecrawlJobResponse, FirecrawlJobStatus, CrawlOptions, DEFAULT_CRAWL_OPTIONS } from './types'

export class FirecrawlClient {
  private readonly baseUrl: string
  private readonly apiKey: string

  constructor(config: Pick<FirecrawlConfig, 'firecrawlApiKey'>) {
    this.baseUrl = process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev'
    this.apiKey = config.firecrawlApiKey

    if (!this.apiKey) {
      throw new Error('FIRECRAWL_API_KEY ist erforderlich')
    }
  }

  async startCrawl(url: string, templateId?: string, options: CrawlOptions = DEFAULT_CRAWL_OPTIONS): Promise<FirecrawlJobResponse> {
    try {
      const requestBody = { url }

      console.log('Sende API-Anfrage:', {
        url: this.baseUrl + '/v1/crawl',
        method: 'POST',
        body: requestBody
      })

      const response = await fetch(`${this.baseUrl}/v1/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API-Fehler:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
      }

      const result = await response.json()
      console.log('API-Antwort:', result)
      return result as FirecrawlJobResponse
    } catch (error) {
      console.error('Fehler beim Starten des Crawl-Jobs:', error)
      throw error
    }
  }

  async checkStatus(jobId: string): Promise<FirecrawlJobStatus | null> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/crawl/${jobId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result as FirecrawlJobStatus
    } catch (error) {
      console.error('Fehler beim Abrufen des Job-Status:', error)
      return null
    }
  }

  async cancelCrawl(jobId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/crawl/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return true
    } catch (error) {
      console.error('Fehler beim Abbrechen des Crawl-Jobs:', error)
      return false
    }
  }
} 