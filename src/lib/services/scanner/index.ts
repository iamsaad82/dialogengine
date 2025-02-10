import { Redis } from 'ioredis'
import { ContentVectorizer, VectorizerConfig } from '../vectorizer'
import * as cheerio from 'cheerio'
import { CheerioAPI } from '../../types/cheerio'
import * as fs from 'fs'
import * as path from 'path'
import * as fsPromises from 'node:fs/promises'
import fetch from 'node-fetch'
import { ContentMetadata, ContentType, ContentTypeEnum, isValidContentType } from '../../types/contentTypes'
import { 
  ScannerConfig, 
  ScanProgress, 
  PageMetadata, 
  MenuItem, 
  Action, 
  WebsiteStructure 
} from '../../types/scanner'

import { NavigationExtractorImpl } from './navigation'
import { ProcessExtractorImpl } from './process'
import { FormExtractorImpl } from './form'
import { ContentExtractorImpl } from './content'

export class WebsiteScanner {
  private vectorizer: ContentVectorizer
  private redis?: Redis
  private readonly templateId: string
  private structure: WebsiteStructure = {
    pages: [],
    navigation: {
      mainMenu: [],
      subMenus: {},
      breadcrumbs: {},
      meta: {
        currentPath: [],
        activeSection: undefined,
        lastUpdated: new Date().toISOString(),
        language: 'de'
      }
    },
    processes: []
  }

  private navigationExtractor: NavigationExtractorImpl
  private processExtractor: ProcessExtractorImpl
  private formExtractor: FormExtractorImpl
  private contentExtractor: ContentExtractorImpl

  constructor(config: ScannerConfig) {
    if (!config.pineconeEnvironment) throw new Error('pineconeEnvironment ist erforderlich')
    if (!config.pineconeIndex) throw new Error('pineconeIndex ist erforderlich')
    if (!config.templateId) throw new Error('templateId ist erforderlich')

    this.templateId = config.templateId
    this.vectorizer = new ContentVectorizer({
      openaiApiKey: config.openaiApiKey,
      pineconeApiKey: config.pineconeApiKey,
      pineconeEnvironment: config.pineconeEnvironment,
      pineconeIndex: config.pineconeIndex,
      pineconeHost: config.pineconeHost,
      templateId: config.templateId
    } as VectorizerConfig)

    if (config.redisUrl) {
      this.redis = new Redis(config.redisUrl)
    }

    this.navigationExtractor = new NavigationExtractorImpl()
    this.processExtractor = new ProcessExtractorImpl()
    this.formExtractor = new FormExtractorImpl()
    this.contentExtractor = new ContentExtractorImpl()
  }

  private async updateProgress(progress: ScanProgress): Promise<void> {
    if (this.redis) {
      await this.redis.set('scan:status', JSON.stringify(progress))
    }
  }

  public async getScanStatus(): Promise<ScanProgress | null> {
    if (!this.redis) return null
    const status = await this.redis.get('scan:status')
    return status ? JSON.parse(status) : null
  }

  private async fetchPage(url: string): Promise<string> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Fehler beim Abrufen von ${url}: ${response.statusText}`)
    }
    return response.text()
  }

  public async scanWebsite(baseUrl: string): Promise<void> {
    try {
      await this.updateProgress({
        status: 'scanning',
        current: 0,
        total: 1,
        error: undefined
      })

      const html = await this.fetchPage(baseUrl)
      const $ = cheerio.load(html) as unknown as CheerioAPI

      // Extrahiere Hauptinhalt und bestimme den Typ
      const contentResult = this.contentExtractor.extractContent(html)
      if (!contentResult.success || !contentResult.data) {
        throw new Error(`Fehler beim Extrahieren des Inhalts: ${contentResult.error}`)
      }

      const { title, content } = contentResult.data
      const contentType = this.contentExtractor.determineType(content)

      // Füge die erste Seite zur Struktur hinzu
      this.structure.pages.push({
        url: baseUrl,
        type: contentType,
        metadata: {
          title,
          description: content
        }
      })

      // Extrahiere Navigation
      const menuResult = await this.navigationExtractor.extractMainMenu($)
      if (menuResult.success && menuResult.data) {
        this.structure.navigation.mainMenu = menuResult.data
      }

      const subMenusResult = await this.navigationExtractor.extractSubMenus($)
      if (subMenusResult.success && subMenusResult.data) {
        this.structure.navigation.subMenus = subMenusResult.data
      }

      const breadcrumbsResult = await this.navigationExtractor.extractBreadcrumbs($)
      if (breadcrumbsResult.success && breadcrumbsResult.data) {
        this.structure.navigation.breadcrumbs = breadcrumbsResult.data
      }

      // Extrahiere Prozesse
      const processPages = this.structure.pages.filter(p => p.type === 'process')
      for (const page of processPages) {
        const processResult = await this.processExtractor.analyzeProcess(page.url)
        if (processResult.success && processResult.data) {
          this.structure.processes.push(processResult.data)
        }
      }

      // Extrahiere Formulare und Interaktionen für alle Seiten
      for (const page of this.structure.pages) {
        const pageHtml = await this.fetchPage(page.url)
        const $ = cheerio.load(pageHtml) as unknown as CheerioAPI
        
        const formsResult = await this.formExtractor.extractForms($)
        const buttonsResult = await this.formExtractor.extractButtons($)
        const messagesResult = await this.formExtractor.extractMessages($)
        
        if (formsResult.success && buttonsResult.success && messagesResult.success) {
          page.metadata = {
            ...page.metadata,
            interactions: {
              forms: formsResult.data,
              buttons: buttonsResult.data,
              messages: messagesResult.data
            }
          }
        }
      }

      // Vektorisiere die Inhalte
      await this.updateProgress({
        status: 'vectorizing',
        current: 0,
        total: this.structure.pages.length,
        error: undefined
      })

      for (let i = 0; i < this.structure.pages.length; i++) {
        const page = this.structure.pages[i]
        if (page.metadata?.description) {
          await this.vectorizer.indexContent(
            page.metadata.description,
            {
              url: page.url,
              title: page.metadata.title,
              type: page.type as ContentType,
              language: 'de',
              templateId: this.templateId,
              lastModified: new Date().toISOString()
            }
          )
        }

        await this.updateProgress({
          status: 'vectorizing',
          current: i + 1,
          total: this.structure.pages.length,
          error: undefined
        })
      }

      await this.saveStructure()

      await this.updateProgress({
        status: 'completed',
        current: this.structure.pages.length,
        total: this.structure.pages.length,
        error: undefined
      })

    } catch (error) {
      console.error('Fehler beim Website-Scan:', error)
      await this.updateProgress({
        status: 'error',
        current: 0,
        total: 0,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      })
      throw error
    }
  }

  public async scanMarkdownDirectory(directory: string): Promise<void> {
    try {
      console.log(`Scanne Markdown-Verzeichnis: ${directory}`)
      
      const allFiles = await fsPromises.readdir(directory, { recursive: true })
      const files = allFiles
        .filter(file => typeof file === 'string' && file.endsWith('.md'))
        .map(file => path.join(directory, file))
      
      await this.updateProgress({
        status: 'scanning',
        current: 0,
        total: files.length,
        error: undefined
      })

      // Initialisiere die Struktur für Markdown-Dateien
      this.structure = {
        pages: [],
        navigation: {
          mainMenu: [],
          subMenus: {},
          breadcrumbs: {},
          meta: {
            currentPath: [],
            activeSection: undefined,
            lastUpdated: new Date().toISOString(),
            language: 'de'
          }
        },
        processes: []
      }

      // Verarbeite jede Markdown-Datei
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const content = await fsPromises.readFile(file, 'utf-8')
        
        // Extrahiere und bereinige den Inhalt
        const cleanContent = this.contentExtractor.cleanMarkdown(content)
        const title = this.contentExtractor.extractTitle(cleanContent)
        const contentType = this.contentExtractor.determineType(cleanContent)

        // Generiere eine URL aus dem Dateipfad
        const url = file
          .replace(/\.md$/, '')
          .replace(/.*?www_aok_de/, 'https://www.aok.de')
          .replace(/\\/g, '/')

        // Füge die Seite zur Struktur hinzu
        this.structure.pages.push({
          url,
          type: contentType,
          metadata: {
            title,
            description: cleanContent,
            fileType: 'markdown',
            fileUrl: file,
            lastModified: (await fsPromises.stat(file)).mtime.toISOString()
          }
        })

        // Aktualisiere den Fortschritt
        await this.updateProgress({
          status: 'scanning',
          current: i + 1,
          total: files.length,
          error: undefined
        })
      }

      // Vektorisiere die Inhalte
      await this.updateProgress({
        status: 'vectorizing',
        current: 0,
        total: this.structure.pages.length,
        error: undefined
      })

      for (let i = 0; i < this.structure.pages.length; i++) {
        const page = this.structure.pages[i]
        if (page.metadata?.description) {
          await this.vectorizer.indexContent(
            page.metadata.description,
            {
              url: page.url,
              title: page.metadata.title,
              type: page.type as ContentType,
              language: 'de',
              templateId: this.templateId,
              lastModified: page.metadata.lastModified || new Date().toISOString(),
              fileType: page.metadata.fileType,
              fileUrl: page.metadata.fileUrl
            }
          )
        }

        await this.updateProgress({
          status: 'vectorizing',
          current: i + 1,
          total: this.structure.pages.length,
          error: undefined
        })
      }

      // Speichere die Struktur
      await this.saveStructure()

      await this.updateProgress({
        status: 'completed',
        current: this.structure.pages.length,
        total: this.structure.pages.length,
        error: undefined
      })
      
      console.log(`Markdown-Verzeichnis erfolgreich gescannt: ${directory}`)
    } catch (error) {
      console.error('Fehler beim Markdown-Scan:', error)
      await this.updateProgress({
        status: 'error',
        current: 0,
        total: 0,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      })
      throw error
    }
  }

  private determineContentType(url: string, title: string, content: string): string {
    try {
      const path = new URL(url).pathname.toLowerCase()
      const titleLower = title.toLowerCase()
      const contentLower = content.toLowerCase()

      // URL-basierte Erkennung
      if (path.includes('/kontakt')) return ContentTypeEnum.CONTACT
      if (path.includes('/faq') || path.includes('/hilfe')) return ContentTypeEnum.FAQ
      if (path.includes('/download')) return ContentTypeEnum.DOWNLOAD
      if (path.includes('/video')) return ContentTypeEnum.VIDEO
      if (path.includes('/standort')) return ContentTypeEnum.LOCATION
      if (path.includes('/service')) return ContentTypeEnum.SERVICE
      if (path.includes('/produkt')) return ContentTypeEnum.PRODUCT
      if (path.includes('/termin')) return ContentTypeEnum.EVENT
      if (path.includes('/navigation')) return ContentTypeEnum.NAVIGATION
      if (path.includes('/prozess')) return ContentTypeEnum.PROCESS
      if (path.includes('/formular')) return ContentTypeEnum.FORM
      if (path.includes('/error') || path.includes('/404')) return ContentTypeEnum.ERROR
      if (path.includes('/wait')) return ContentTypeEnum.WAIT

      // Titel-basierte Erkennung
      if (titleLower.includes('kontakt')) return ContentTypeEnum.CONTACT
      if (titleLower.includes('faq') || titleLower.includes('häufige fragen')) return ContentTypeEnum.FAQ
      if (titleLower.includes('download')) return ContentTypeEnum.DOWNLOAD
      if (titleLower.includes('video')) return ContentTypeEnum.VIDEO
      if (titleLower.includes('standort')) return ContentTypeEnum.LOCATION
      if (titleLower.includes('service')) return ContentTypeEnum.SERVICE
      if (titleLower.includes('produkt')) return ContentTypeEnum.PRODUCT
      if (titleLower.includes('termin')) return ContentTypeEnum.EVENT

      // Content-basierte Erkennung
      if (contentLower.includes('versicherung')) return ContentTypeEnum.INSURANCE
      if (contentLower.includes('arzt') || contentLower.includes('medizin')) return ContentTypeEnum.MEDICAL

      // Fallback
      return ContentTypeEnum.INFO
    } catch (error) {
      console.warn('Fehler bei der Content-Type-Bestimmung:', error)
      return ContentTypeEnum.ERROR
    }
  }

  private async saveStructure() {
    if (this.redis) {
      await this.redis.set(
        `template:${this.templateId}:structure`,
        JSON.stringify(this.structure)
      )
    }
  }

  public async processUploadedFile(filePath: string): Promise<void> {
    try {
      await this.updateProgress({
        status: 'scanning',
        current: 0,
        total: 1
      })

      const content = await fsPromises.readFile(filePath, 'utf-8')
      const { data: extractedContent } = this.contentExtractor.extractContent(content)
      if (!extractedContent) {
        throw new Error('Fehler beim Extrahieren des Inhalts')
      }

      const contentType = this.contentExtractor.determineType(extractedContent.content)

      if (!this.structure.pages) {
        this.structure.pages = []
      }

      this.structure.pages.push({
        url: filePath,
        type: contentType,
        metadata: {
          title: extractedContent.title,
          description: extractedContent.content,
          fileType: 'document',
          fileUrl: filePath,
          lastModified: new Date().toISOString()
        }
      })

      await this.updateProgress({
        status: 'vectorizing',
        current: 0,
        total: 1
      })

      await this.vectorizer.indexContent(
        extractedContent.content,
        {
          url: filePath,
          title: extractedContent.title,
          type: contentType,
          language: 'de',
          templateId: this.templateId,
          lastModified: new Date().toISOString()
        }
      )

      await this.saveStructure()

      await this.updateProgress({
        status: 'completed',
        current: 1,
        total: 1
      })

    } catch (error) {
      console.error('Fehler beim Verarbeiten der Datei:', error)
      await this.updateProgress({
        status: 'error',
        current: 0,
        total: 1,
        error: error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten'
      })
      throw error
    }
  }
} 