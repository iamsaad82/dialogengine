import { MonitoringService } from '../../monitoring/monitoring'
import { DocumentLinks } from './types'

export class LinkExtractor {
  private monitoring: MonitoringService
  private readonly AOK_DOMAINS = [
    'aok.de',
    'www.aok.de',
    'plus.aok.de',
    'gesundheit.aok.de',
    'familienportal.aok.de',
    'pflege.aok.de'
  ]

  private readonly AOK_CATEGORIES = {
    MEDICAL: ['behandlung', 'therapie', 'arzt', 'medizin'],
    PREVENTION: ['vorsorge', 'praevention', 'gesundheit'],
    INSURANCE: ['versicherung', 'leistung', 'tarif'],
    SERVICE: ['service', 'beratung', 'antrag'],
    BONUS: ['bonus', 'praemie', 'vorteil'],
    CURAPLAN: ['curaplan', 'chronisch', 'diabetes', 'asthma'],
    FAMILY: ['familie', 'kind', 'schwanger', 'eltern'],
    DIGITAL: ['online', 'app', 'digital'],
    EMERGENCY: ['notfall', 'akut', 'soforthilfe'],
    CONTACT: ['kontakt', 'ansprechpartner', 'filiale']
  }

  constructor(monitoring: MonitoringService) {
    this.monitoring = monitoring
  }

  async extract(content: string): Promise<DocumentLinks> {
    try {
      console.log('[LinkExtractor] Starte Link-Extraktion')
      console.log('[LinkExtractor] Content-Länge:', content.length)
      
      // Extrahiere verschiedene Link-Typen
      const markdownLinks = this.extractMarkdownLinks(content)
      const htmlLinks = this.extractHtmlLinks(content)
      const allLinks = [...markdownLinks, ...htmlLinks]
      
      console.log(`[LinkExtractor] Gefundene Links:`)
      console.log(`- Markdown-Links: ${markdownLinks.length}`)
      console.log(`- HTML-Links: ${htmlLinks.length}`)
      console.log(`- Gesamt: ${allLinks.length}`)
      
      // Extrahiere verschiedene Bild-Typen
      const markdownImages = this.extractMarkdownImages(content)
      const htmlImages = this.extractHtmlImages(content)
      const allImages = [...markdownImages, ...htmlImages]
      
      console.log(`[LinkExtractor] Gefundene Bilder:`)
      console.log(`- Markdown-Bilder: ${markdownImages.length}`)
      console.log(`- HTML-Bilder: ${htmlImages.length}`)
      console.log(`- Gesamt: ${allImages.length}`)
      
      // Kategorisiere Links
      const { internal, external } = this.categorizeLinks(allLinks)
      console.log(`[LinkExtractor] Kategorisierte Links: ${internal.length} intern, ${external.length} extern`)
      
      // Verarbeite Medien
      const media = this.processMedia(allImages)
      console.log(`[LinkExtractor] Verarbeitete Medien: ${media.length}`)

      // Debug-Ausgabe der gefundenen Links
      if (internal.length > 0) {
        console.log('[LinkExtractor] Interne Links:', internal.map(l => l.url))
      }
      if (external.length > 0) {
        console.log('[LinkExtractor] Externe Links:', external.map(l => l.url))
      }
      if (media.length > 0) {
        console.log('[LinkExtractor] Medien:', media.map(m => m.url))
      }
      
      return { internal, external, media }
    } catch (error) {
      console.error('[LinkExtractor] Fehler bei der Link-Extraktion:', error)
      this.monitoring.recordError('link_extraction', error instanceof Error ? error.message : 'Unbekannter Fehler')
      return { internal: [], external: [], media: [] }
    }
  }

  private extractHtmlLinks(content: string): Array<{ title: string; url: string; context: string }> {
    // HTML Link Pattern mit optionalem title-Attribut
    const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/g
    const links: Array<{ title: string; url: string; context: string }> = []
    
    console.log('[LinkExtractor] Suche nach HTML-Links...')
    
    let match
    while ((match = linkPattern.exec(content)) !== null) {
      try {
        const [fullMatch, url, title] = match
        console.log('[LinkExtractor] Gefundener HTML-Link:', { title, url, position: match.index })
        
        // Extrahiere Kontext (50 Zeichen vor und nach dem Link)
        const start = Math.max(0, match.index - 50)
        const end = Math.min(content.length, match.index + fullMatch.length + 50)
        const context = content.slice(start, end).trim()
        
        links.push({
          title: title.trim(),
          url: url.trim(),
          context
        })
      } catch (error) {
        console.warn('[LinkExtractor] Fehler beim Extrahieren eines HTML-Links:', error)
      }
    }

    return links
  }

  private extractHtmlImages(content: string): Array<{ url: string; description: string }> {
    // HTML Image Pattern mit optionalem alt-Attribut
    const imagePattern = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'][^>]*)?>/g
    const images: Array<{ url: string; description: string }> = []
    
    console.log('[LinkExtractor] Suche nach HTML-Bildern...')
    
    let match
    while ((match = imagePattern.exec(content)) !== null) {
      try {
        const [fullMatch, url, altText = ''] = match
        console.log('[LinkExtractor] Gefundenes HTML-Bild:', { altText, url, position: match.index })
        
        images.push({
          url: url.trim(),
          description: altText.trim()
        })
      } catch (error) {
        console.warn('[LinkExtractor] Fehler beim Extrahieren eines HTML-Bildes:', error)
      }
    }

    return images
  }

  private extractMarkdownLinks(content: string): Array<{ title: string; url: string; context: string }> {
    // Einfaches Pattern für Markdown-Links
    const linkPattern = /\[([^\]]+?)\]\(([^)]+?)(?:\s+"[^"]*")?\)/gm
    
    const links: Array<{ title: string; url: string; context: string }> = []
    
    console.log('[LinkExtractor] Suche nach Markdown-Links...')
    console.log('[LinkExtractor] Content-Preview:', content.substring(0, 200))
    
    let match
    while ((match = linkPattern.exec(content)) !== null) {
      try {
        const [fullMatch, title, url] = match
        
        // Ignoriere Bild-Links (die mit ! beginnen)
        const prevChar = content.charAt(Math.max(0, match.index - 1))
        if (prevChar === '!') {
          console.log('[LinkExtractor] Bild-Link übersprungen:', { title, url })
          continue
        }
        
        // Bereinige die URL und den Titel
        const cleanTitle = title.replace(/\s+/g, ' ').trim()
        const cleanUrl = url.replace(/\s+/g, '').trim()
        
        console.log('[LinkExtractor] Gefundener Markdown-Link:', {
          title: cleanTitle,
          url: cleanUrl,
          position: match.index
        })
        
        // Extrahiere Kontext (50 Zeichen vor und nach dem Link)
        const start = Math.max(0, match.index - 50)
        const end = Math.min(content.length, match.index + fullMatch.length + 50)
        const context = content.slice(start, end).replace(/\s+/g, ' ').trim()
        
        links.push({
          title: cleanTitle,
          url: cleanUrl,
          context
        })
      } catch (error) {
        console.warn('[LinkExtractor] Fehler beim Extrahieren eines Markdown-Links:', error)
      }
    }

    return links
  }

  private extractMarkdownImages(content: string): Array<{ url: string; description: string }> {
    // Verbesserte Regex für Markdown-Bilder (auch in Überschriften)
    const imagePattern = /(?:^|\n)(?:#{1,6}\s*)?!\[([^\]]*?)\]\(([^)]+?)(?:\s+"[^"]*")?\)/gm
    const images: Array<{ url: string; description: string }> = []
    
    console.log('[LinkExtractor] Suche nach Markdown-Bildern...')
    console.log('[LinkExtractor] Content-Preview:', content.substring(0, 200))
    
    let match
    while ((match = imagePattern.exec(content)) !== null) {
      try {
        const [fullMatch, altText, url] = match
        const cleanAltText = altText.replace(/\s+/g, ' ').trim()
        const cleanUrl = url.replace(/\s+/g, '').trim()
        
        console.log('[LinkExtractor] Gefundenes Markdown-Bild:', {
          altText: cleanAltText,
          url: cleanUrl,
          position: match.index
        })
        
        images.push({
          url: cleanUrl,
          description: cleanAltText
        })
      } catch (error) {
        console.warn('[LinkExtractor] Fehler beim Extrahieren eines Markdown-Bildes:', error)
      }
    }

    return images
  }

  private categorizeAOKLink(url: string, title: string, context: string): string {
    const textToAnalyze = `${url} ${title} ${context}`.toLowerCase()
    
    for (const [category, keywords] of Object.entries(this.AOK_CATEGORIES)) {
      if (keywords.some(keyword => textToAnalyze.includes(keyword))) {
        return `aok-${category.toLowerCase()}`
      }
    }
    
    return 'aok-service' // Default Kategorie
  }

  private categorizeLinks(links: Array<{ title: string; url: string; context: string }>) {
    const internal: Array<{ url: string; title: string; context: string; category?: string }> = []
    const external: Array<{ url: string; domain: string; trust: number }> = []

    for (const link of links) {
      try {
        const cleanUrl = link.url.trim().replace(/\s+/g, '')
        let url: URL
        
        try {
          url = new URL(cleanUrl)
        } catch {
          if (cleanUrl.startsWith('/')) {
            url = new URL(`https://www.aok.de${cleanUrl}`)
          } else {
            url = new URL(`https://${cleanUrl}`)
          }
        }

        const domain = url.hostname.toLowerCase()
        
        if (this.AOK_DOMAINS.includes(domain)) {
          const category = this.categorizeAOKLink(url.toString(), link.title, link.context)
          internal.push({
            ...link,
            url: url.toString(),
            category
          })
        } else {
          external.push({
            url: url.toString(),
            domain,
            trust: this.calculateTrustScore(domain)
          })
        }
      } catch (error) {
        console.warn(`[LinkExtractor] Ungültige URL: ${link.url}`, error)
      }
    }

    return { internal, external }
  }

  private processMedia(images: Array<{ url: string; description: string }>) {
    return images.map(image => {
      const url = image.url
      let type: 'image' | 'video' | 'pdf'
      
      // Bestimme Medientyp basierend auf URL/Dateiendung
      if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)($|\?)/i)) {
        type = 'image'
      } else if (url.match(/\.(mp4|webm|avi|mov)($|\?)/i)) {
        type = 'video'
      } else if (url.match(/\.(pdf)($|\?)/i)) {
        type = 'pdf'
      } else {
        // Standard: Behandle unbekannte Typen als Bilder
        type = 'image'
      }

      return {
        url,
        type,
        description: image.description
      }
    })
  }

  private calculateTrustScore(domain: string): number {
    // Vertrauenswürdigkeit basierend auf Domain
    const trustedDomains = [
      'bundesgesundheitsministerium.de',
      'rki.de',
      'who.int',
      'gesundheit.de',
      'tk.de',
      'barmer.de'
    ]
    
    if (trustedDomains.includes(domain)) {
      return 1.0
    }
    
    // Höheres Vertrauen für .de Domains im Gesundheitsbereich
    if (domain.endsWith('.de') && 
        (domain.includes('gesundheit') || 
         domain.includes('medizin') || 
         domain.includes('arzt'))) {
      return 0.8
    }
    
    // Mittleres Vertrauen für andere .de Domains
    if (domain.endsWith('.de')) {
      return 0.6
    }
    
    // Basis-Vertrauen für andere Domains
    return 0.4
  }

  async validate(links: DocumentLinks): Promise<{ valid: boolean; error?: string }> {
    try {
      // Validiere interne Links
      for (const link of links.internal) {
        if (!link.url.startsWith('http')) {
          return {
            valid: false,
            error: `Ungültiges URL-Format für internen Link: ${link.url}`
          }
        }
      }
      
      // Validiere externe Links
      for (const link of links.external) {
        if (!link.url.startsWith('http')) {
          return {
            valid: false,
            error: `Ungültiges URL-Format für externen Link: ${link.url}`
          }
        }
        if (link.trust < 0 || link.trust > 1) {
          return {
            valid: false,
            error: `Ungültiger Trust-Score für ${link.url}: ${link.trust}`
          }
        }
      }
      
      // Validiere Medien
      for (const media of links.media) {
        if (!media.url.startsWith('http')) {
          return {
            valid: false,
            error: `Ungültiges URL-Format für Medium: ${media.url}`
          }
        }
        if (!['image', 'video', 'pdf'].includes(media.type)) {
          return {
            valid: false,
            error: `Ungültiger Medientyp für ${media.url}: ${media.type}`
          }
        }
      }
      
      return { valid: true }
    } catch (error) {
      console.error('[LinkExtractor] Fehler bei der Link-Validierung:', error)
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler bei der Validierung'
      }
    }
  }
} 