import { load } from 'cheerio'
import { createHash } from 'crypto'
import { Redis } from '@upstash/redis'
import { OpenAIEmbedding } from '@/lib/services/embeddings'
import { chunk } from '@/lib/utils'

// Kostengünstige Caching-Lösung mit Upstash Redis
const redis = Redis.fromEnv()

interface CrawlOptions {
  urls: string[]
  excludePatterns: string[]
  maxPages?: number
  chunkSize?: number
}

interface ProcessedPage {
  url: string
  title: string
  content: string
  chunks: string[]
  hash: string
  lastModified?: string
}

export class Crawler {
  private visited = new Set<string>()
  private domain: string = ''
  
  constructor(private options: CrawlOptions) {
    if (options.urls[0]) {
      const url = new URL(options.urls[0])
      this.domain = url.hostname
    }
  }

  private shouldExclude(url: string): boolean {
    return this.options.excludePatterns.some(pattern => {
      const regex = new RegExp(pattern.replace('*', '.*'))
      return regex.test(url)
    })
  }

  private async fetchPage(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'DialogEngine Crawler/1.0' }
      })
      if (!response.ok) return null
      return await response.text()
    } catch (error) {
      console.error(`Fehler beim Abrufen von ${url}:`, error)
      return null
    }
  }

  private extractLinks(html: string, baseUrl: string): string[] {
    const $ = load(html)
    const links = new Set<string>()
    
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href')
      if (!href) return
      
      try {
        const url = new URL(href, baseUrl)
        if (url.hostname === this.domain && !this.shouldExclude(url.href)) {
          links.add(url.href)
        }
      } catch (error) {
        // Ungültige URLs ignorieren
      }
    })
    
    return Array.from(links)
  }

  private processContent(html: string): string {
    const $ = load(html)
    
    // Unnötige Elemente entfernen
    $('script, style, nav, footer, iframe, noscript').remove()
    
    // Hauptinhalt extrahieren
    const title = $('title').text()
    const mainContent = $('main, article, [role="main"]').first()
    const content = mainContent.length ? mainContent.text() : $('body').text()
    
    // Text bereinigen
    return [title, content]
      .join('\n')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private async processPage(url: string, html: string): Promise<ProcessedPage> {
    const content = this.processContent(html)
    const hash = createHash('md5').update(content).digest('hex')
    
    // Prüfen ob sich der Inhalt geändert hat
    const cachedHash = await redis.get<string>(`page:${url}:hash`)
    if (cachedHash === hash) {
      throw new Error('Page not modified')
    }
    
    // Text in Chunks aufteilen
    const chunks = chunk(content, this.options.chunkSize || 300)
    
    return {
      url,
      title: content.split('\n')[0],
      content,
      chunks: chunks.filter((chunk): chunk is string => typeof chunk === 'string'),
      hash
    }
  }

  public async crawl(): Promise<ProcessedPage[]> {
    const pages: ProcessedPage[] = []
    const queue = [...this.options.urls]
    
    while (queue.length > 0 && (!this.options.maxPages || pages.length < this.options.maxPages)) {
      const url = queue.shift()
      if (!url || this.visited.has(url)) continue
      
      this.visited.add(url)
      console.log(`Crawling ${url}...`)
      
      const html = await this.fetchPage(url)
      if (!html) continue
      
      try {
        const page = await this.processPage(url, html)
        pages.push(page)
        
        // Cache aktualisieren
        await redis.set(`page:${url}:hash`, page.hash)
        
        // Neue Links zur Queue hinzufügen
        const links = this.extractLinks(html, url)
        queue.push(...links.filter(link => !this.visited.has(link)))
      } catch (error) {
        if (error instanceof Error && error.message !== 'Page not modified') {
          console.error(`Fehler bei ${url}:`, error.message)
        }
      }
    }
    
    return pages
  }
}

export const cacheResponse = async (key: string, data: any) => {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.log('Redis nicht konfiguriert')
    return
  }
  
  try {
    // ... rest of the code ...
  } catch (error) {
    console.error('Fehler beim Cachen:', error)
  }
} 