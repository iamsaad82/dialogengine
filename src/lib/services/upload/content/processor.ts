import { XMLParser } from 'fast-xml-parser'
import { Logger } from '@/lib/utils/logger'
import type { XMLParserOptions, XMLValue as XMLValueType } from '@/lib/types/upload/content'

export class ContentProcessor {
  private logger: Logger
  private readonly CHUNK_SIZE = 1024 * 1024 // 1MB
  
  constructor() {
    this.logger = new Logger('ContentProcessor')
  }

  /**
   * Extrahiert Text aus verschiedenen Dateiformaten
   */
  public async extractContent(file: File): Promise<string> {
    this.logger.info(`Extrahiere Content aus ${file.name}`)
    const fileSize = file.size
    
    // Große Dateien über 5MB
    if (fileSize > 5 * 1024 * 1024) {
      this.logger.info(`Große Datei erkannt (${(fileSize / 1024 / 1024).toFixed(2)}MB)`)
      
      if (file.name.endsWith('.xml')) {
        return await this.processLargeFile(file, 'xml')
      } else if (file.name.endsWith('.md')) {
        return await this.processLargeFile(file, 'md')
      }
    }
    
    // Kleinere Dateien
    const content = await file.text()
    
    if (file.name.endsWith('.xml')) {
      return await this.processXMLContent(content)
    }
    
    return content
  }

  /**
   * Verarbeitet große Dateien in Chunks
   */
  private async processLargeFile(file: File, fileType: 'xml' | 'md'): Promise<string> {
    let content = ''
    
    if (fileType === 'xml') {
      const parser = new XMLParser({
        ignoreAttributes: false,
        parseAttributeValue: true,
        allowBooleanAttributes: true,
        isArray: () => false,
        parseTagValue: true,
        trimValues: true
      } as XMLParserOptions)
      
      let xmlBuffer = ''
      
      for await (const chunk of this.createChunkGenerator(file)) {
        xmlBuffer += new TextDecoder().decode(chunk)
        
        while (xmlBuffer.includes('</')) {
          const endIndex = xmlBuffer.indexOf('</') + xmlBuffer.slice(xmlBuffer.indexOf('</')).indexOf('>') + 1
          if (endIndex === -1) break
          
          const xmlChunk = xmlBuffer.slice(0, endIndex)
          xmlBuffer = xmlBuffer.slice(endIndex)
          
          try {
            const parsed = parser.parse(xmlChunk)
            if (this.isXMLValue(parsed)) {
              content += this.extractTextFromXML(parsed) + ' '
            }
          } catch (error) {
            this.logger.warn('Warnung beim Parsen eines XML-Chunks:', error)
          }
        }
      }
      
      if (xmlBuffer) {
        try {
          const parsed = parser.parse(xmlBuffer)
          if (this.isXMLValue(parsed)) {
            content += this.extractTextFromXML(parsed)
          }
        } catch (error) {
          this.logger.warn('Warnung beim Parsen des letzten XML-Chunks:', error)
        }
      }
    } else if (fileType === 'md') {
      let mdBuffer = ''
      
      for await (const chunk of this.createChunkGenerator(file)) {
        mdBuffer += new TextDecoder().decode(chunk)
        
        if (mdBuffer.length > this.CHUNK_SIZE) {
          content += await this.processMarkdownChunk(mdBuffer)
          mdBuffer = ''
        }
      }
      
      if (mdBuffer) {
        content += await this.processMarkdownChunk(mdBuffer)
      }
    }

    return content.trim()
  }

  /**
   * Generator für Datei-Chunks
   */
  private async *createChunkGenerator(file: File) {
    const reader = file.stream().getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        yield value
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * Verarbeitet XML-Content
   */
  private async processXMLContent(content: string): Promise<string> {
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        parseAttributeValue: true,
        allowBooleanAttributes: true,
        isArray: () => false,
        parseTagValue: true,
        trimValues: true
      } as XMLParserOptions)
      
      const parsed = parser.parse(content)
      if (this.isXMLValue(parsed)) {
        const extractedText = this.extractTextFromXML(parsed)
        this.logger.debug('Extrahierter Text aus XML:', extractedText.substring(0, 100) + '...')
        return extractedText
      }
      throw new Error('Ungültiges XML-Format')
    } catch (error) {
      this.logger.error('Fehler beim XML-Parsing:', error instanceof Error ? error : new Error('Unbekannter Fehler'))
      throw new Error('Ungültiges XML-Format')
    }
  }

  /**
   * Verarbeitet Markdown-Chunks
   */
  private async processMarkdownChunk(chunk: string): Promise<string> {
    return chunk
      .replace(/[#*_`~]/g, '') // Entferne Markdown-Syntax
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Extrahiere Text aus Links
      .replace(/\n\s*\n/g, '\n') // Reduziere mehrfache Leerzeilen
      .trim() + '\n'
  }

  /**
   * Prüft ob ein Wert ein gültiger XML-Wert ist
   */
  private isXMLValue(value: unknown): value is XMLValueType {
    if (value === null) return true
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true
    if (Array.isArray(value)) return value.every(item => this.isXMLValue(item))
    if (typeof value === 'object') return Object.values(value as object).every(v => this.isXMLValue(v))
    return false
  }

  /**
   * Extrahiert Text aus XML-Werten
   */
  private extractTextFromXML(obj: XMLValueType): string {
    if (obj === null) return ''
    if (typeof obj === 'string') return obj
    if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj)
    if (Array.isArray(obj)) return obj.map(item => this.extractTextFromXML(item)).join(' ')
    return Object.values(obj)
      .filter((value): value is XMLValueType => value !== undefined)
      .map(value => this.extractTextFromXML(value))
      .join(' ')
  }
} 