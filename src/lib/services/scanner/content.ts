import { CheerioAPI } from '../../types/cheerio'
import { ContentExtractor, ExtractorResult } from './types'
import { ContentType, ContentTypeEnum, isValidContentType } from '../../types/contentTypes'
import * as cheerio from 'cheerio'

export class ContentExtractorImpl implements ContentExtractor {
  extractContent(html: string): ExtractorResult<{ title: string; content: string }> {
    try {
      const $ = cheerio.load(html)
      
      // Entferne unerwünschte Elemente
      $('script, style, nav, footer, header, .cookie-banner, .ads, [role="banner"], [role="contentinfo"]').remove()
      
      // Versuche den Titel in dieser Reihenfolge zu finden
      const title = 
        $('meta[property="og:title"]').attr('content') ||
        $('title').text().trim() ||
        $('h1').first().text().trim() ||
        ''
      
      // Versuche den Hauptinhalt zu finden
      let content = ''
      const mainContent = $('main, article, [role="main"]').first()
      
      if (mainContent.length) {
        content = mainContent.text()
      } else {
        // Fallback: Suche nach dem größten Textblock
        const textBlocks = $('body').find('p, article, section, div').map((_i, el) => {
          const $el = $(el)
          return {
            element: $el,
            textLength: $el.text().trim().length
          }
        }).get()
        
        const largestBlock = textBlocks.reduce((max, current) => 
          current.textLength > max.textLength ? current : max
        , textBlocks[0])
        
        content = largestBlock ? largestBlock.element.text() : $('body').text()
      }
      
      // Bereinige den Inhalt
      content = content
        .replace(/\s+/g, ' ')
        .trim()
      
      return {
        success: true,
        data: { title, content }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Fehler beim Extrahieren des Inhalts'
      }
    }
  }

  extractTitle(content: string): string {
    try {
      // Suche nach Markdown-Überschriften
      const titleMatch = content.match(/^#\s*(.+)$/m) ||
                        content.match(/^==+\s*(.+?)\s*==+$/m) ||
                        content.match(/^(.+)\n=+\s*$/m)
      
      if (titleMatch) return titleMatch[1].trim()
      
      // Fallback: Erste nicht-leere Zeile
      const firstLine = content.split('\n').find(line => line.trim().length > 0)
      return firstLine ? firstLine.trim() : 'Untitled'
    } catch (error) {
      console.error('Fehler beim Extrahieren des Titels:', error)
      return 'Untitled'
    }
  }

  cleanMarkdown(content: string): string {
    return content
      // Entferne YAML Frontmatter
      .replace(/^---[\s\S]*?---/m, '')
      // Entferne Markdown-Links aber behalte den Text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Entferne Bilder
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
      // Entferne HTML-Tags
      .replace(/<[^>]+>/g, '')
      // Entferne Code-Blöcke
      .replace(/```[\s\S]*?```/g, '')
      // Entferne Inline-Code
      .replace(/`[^`]+`/g, '')
      // Entferne Überschriften-Symbole
      .replace(/^#{1,6}\s+/gm, '')
      // Entferne horizontale Linien
      .replace(/^[\s-*_]{3,}$/gm, '')
      // Normalisiere Whitespace
      .replace(/\s+/g, ' ')
      .trim()
  }

  determineType(content: string): ContentType {
    const lowerContent = content.toLowerCase()
    const indicators = {
      medical: ['behandlung', 'therapie', 'diagnose', 'symptome', 'krankheit'],
      insurance: ['versicherung', 'leistung', 'erstattung', 'tarif', 'beitrag'],
      service: ['beratung', 'kontakt', 'termin', 'sprechstunde'],
      faq: ['faq', 'häufige fragen', 'frequently asked'],
      form: ['formular', 'antrag', 'eingabe'],
      process: ['prozess', 'ablauf', 'schritte', 'vorgehensweise'],
      info: ['information', 'übersicht', 'details']
    }
    
    // Zähle die Vorkommen der Indikatoren
    const scores = Object.entries(indicators).map(([type, keywords]) => ({
      type,
      score: keywords.reduce((count, keyword) => 
        count + (lowerContent.match(new RegExp(keyword, 'g')) || []).length
      , 0)
    }))
    
    // Wähle den Typ mit dem höchsten Score
    const bestMatch = scores.reduce((max, current) => 
      current.score > max.score ? current : max
    )
    
    // Prüfe ob der gefundene Typ gültig ist
    return isValidContentType(bestMatch.type) ? bestMatch.type as ContentType : 'info'
  }

  determineContentType(content: string): ContentType {
    // Diese Methode ist jetzt ein Alias für determineType
    // für Abwärtskompatibilität
    return this.determineType(content)
  }
} 