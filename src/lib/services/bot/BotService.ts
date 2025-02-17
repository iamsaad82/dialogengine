import { ParsedBot } from '@/lib/types/template'
import { DocumentLinks } from '../document/types'
import { HandlerManager } from '../search/handlers/manager'
import { HandlerConfig } from '../search/handlers/types'
import { prisma } from '@/lib/prisma'

export class BotService {
  private handlerManager?: HandlerManager

  constructor(config?: Partial<HandlerConfig>) {
    if (config?.openaiApiKey && config?.pineconeApiKey) {
      this.handlerManager = new HandlerManager({
        templateId: '',  // Wird pro Anfrage gesetzt
        openaiApiKey: config.openaiApiKey,
        pineconeApiKey: config.pineconeApiKey,
        pineconeEnvironment: config.pineconeEnvironment || '',
        pineconeIndex: config.pineconeIndex || ''
      })
    }
  }

  async processMessage(
    message: string,
    templateId: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<{
    text: string
    type?: string
    metadata?: Record<string, any>
    additionalButtons?: Array<{ type: string; url: string; buttonText: string }>
  }> {
    // Hole Template-Konfiguration
    const template = await prisma.template.findUnique({
      where: { id: templateId }
    })

    if (!template || !template.jsonBot) {
      throw new Error('Template or bot configuration not found')
    }

    const botConfig = JSON.parse(template.jsonBot.toString()) as ParsedBot

    // Verarbeite Nachricht basierend auf Bot-Typ
    switch (botConfig.type) {
      case 'aok-handler':
        if (!botConfig.aokHandler) {
          throw new Error('AOK handler configuration missing')
        }
        return this.processAOKMessage(message, templateId, history)
      
      case 'examples':
        return this.processExampleMessage(message, botConfig.examples || [])
      
      case 'flowise':
        if (!botConfig.flowise) {
          throw new Error('Flowise configuration missing')
        }
        return this.processFlowiseMessage(message, botConfig.flowise)
      
      case 'smart-search':
        if (!botConfig.smartSearch) {
          throw new Error('Smart search configuration missing')
        }
        return this.processSmartSearchMessage(message, botConfig.smartSearch)
      
      default:
        throw new Error(`Unsupported bot type: ${botConfig.type}`)
    }
  }

  private async processAOKMessage(
    message: string,
    templateId: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  ) {
    if (!this.handlerManager) {
      throw new Error('HandlerManager not initialized')
    }

    const response = await this.handlerManager.processRequest({
      query: message,
      type: 'aok',
      metadata: {
        history,
        templateId
      }
    })

    // Extrahiere Links und Medien aus den Quellen
    const links = this.extractLinksFromSources(response.metadata.sources || [])

    return {
      text: response.text,
      type: response.metadata.category,
      metadata: {
        ...response.metadata,
        links
      },
      additionalButtons: this.generateButtonsFromLinks(links)
    }
  }

  private async processExampleMessage(message: string, examples: Array<{ question: string; answer: string; type?: string; metadata?: any }>) {
    // Bestehende Example-Bot Logik
    const example = examples.find(e => 
      e.question.toLowerCase() === message.toLowerCase()
    )

    if (!example) {
      return {
        text: 'Entschuldigung, ich habe keine passende Antwort gefunden.',
        type: 'info'
      }
    }

    return {
      text: example.answer,
      type: example.type || 'info',
      metadata: example.metadata
    }
  }

  private async processFlowiseMessage(
    message: string,
    flowiseConfig: { chatflowId: string; apiHost: string; apiKey: string }
  ) {
    // Bestehende Flowise-Bot Logik
    // ... (existierender Code)
    return {
      text: "Flowise response", // Placeholder
      type: 'info'
    }
  }

  private async processSmartSearchMessage(
    message: string,
    searchConfig: ParsedBot['smartSearch']
  ) {
    if (!searchConfig) return {
      text: "Configuration error",
      type: 'error'
    }
    
    // Bestehende Smart-Search Logik
    // ... (existierender Code)
    return {
      text: "Smart search response", // Placeholder
      type: 'info'
    }
  }

  private extractLinksFromSources(sources: any[]): DocumentLinks {
    return {
      internal: sources
        .filter(s => s.metadata?.links?.internal)
        .flatMap(s => s.metadata.links.internal) || [],
      external: sources
        .filter(s => s.metadata?.links?.external)
        .flatMap(s => s.metadata.links.external) || [],
      media: sources
        .filter(s => s.metadata?.links?.media)
        .flatMap(s => s.metadata.links.media) || []
    }
  }

  private generateButtonsFromLinks(links: DocumentLinks) {
    const buttons = []

    // Konvertiere relevante Links zu Buttons
    if (links.internal && links.internal.length > 0) {
      buttons.push({
        type: 'internal',
        url: links.internal[0].url,
        buttonText: 'Mehr Informationen'
      })
    }

    // Füge Medien-Buttons hinzu
    if (links.media) {
      links.media.forEach(media => {
        if (media.type === 'video') {
          buttons.push({
            type: 'video',
            url: media.url,
            buttonText: 'Video ansehen'
          })
        }
      })
    }

    return buttons
  }

  private getRandomTemplate(templates: string[]): string {
    const index = Math.floor(Math.random() * templates.length)
    return templates[index]
  }

  private formatResponse(
    template: string, 
    facts: string[], 
    additionalFacts?: string[],
    links?: DocumentLinks
  ): string {
    let response = template

    // Ersetze {{facts}} mit zufällig ausgewählten und neu formulierten Fakten
    if (response.includes('{{facts}}')) {
      const selectedFacts = facts
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .join(' ')
      response = response.replace('{{facts}}', selectedFacts)
    }

    // Ersetze {{additionalFacts}} mit zufällig ausgewählten zusätzlichen Fakten
    if (response.includes('{{additionalFacts}}') && additionalFacts) {
      const selectedAdditionalFacts = additionalFacts
        .sort(() => Math.random() - 0.5)
        .slice(0, 2)
        .join(' ')
      response = response.replace('{{additionalFacts}}', selectedAdditionalFacts)
    }

    // Füge relevante Links hinzu, wenn vorhanden
    if (links) {
      response = this.appendLinks(response, links)
    }

    return response
  }

  private appendLinks(response: string, links: DocumentLinks): string {
    const linkSections: string[] = []

    // Füge interne Links hinzu
    if (links.internal && links.internal.length > 0) {
        const internalLinks = links.internal
            .map(link => `[${link.title}](${link.url})`)
            .join('\n- ')
        linkSections.push(`\n\n**Weiterführende Informationen:**\n- ${internalLinks}`)
    }

    // Füge externe Links hinzu
    if (links.external && links.external.length > 0) {
        // Sortiere Links nach Trust-Score
        const sortedLinks = [...links.external].sort((a, b) => b.trust - a.trust)
        
        // Gruppiere Links nach Vertrauenswürdigkeit
        const trustedLinks = sortedLinks.filter(link => link.trust >= 0.8)
        const otherLinks = sortedLinks.filter(link => link.trust < 0.8)

        if (trustedLinks.length > 0) {
            const trusted = trustedLinks
                .map(link => `[${link.domain}](${link.url})`)
                .join('\n- ')
            linkSections.push(`\n\n**Offizielle Quellen:**\n- ${trusted}`)
        }

        if (otherLinks.length > 0) {
            const others = otherLinks
                .map(link => `[${link.domain}](${link.url})`)
                .join('\n- ')
            linkSections.push(`\n\n**Weitere Quellen:**\n- ${others}`)
        }
    }

    // Füge Medien-Links hinzu
    if (links.media && links.media.length > 0) {
        const mediaByType = links.media.reduce((acc, media) => {
            if (!acc[media.type]) {
                acc[media.type] = []
            }
            acc[media.type].push(media)
            return acc
        }, {} as Record<string, typeof links.media>)

        // Bilder
        if (mediaByType['image'] && mediaByType['image'].length > 0) {
            const images = mediaByType['image']
                .map(media => `![${media.description}](${media.url})`)
                .join('\n')
            linkSections.push(`\n\n**Bilder:**\n${images}`)
        }

        // Videos
        if (mediaByType['video'] && mediaByType['video'].length > 0) {
            const videos = mediaByType['video']
                .map(media => `[🎥 ${media.description}](${media.url})`)
                .join('\n- ')
            linkSections.push(`\n\n**Videos:**\n- ${videos}`)
        }

        // PDFs
        if (mediaByType['pdf'] && mediaByType['pdf'].length > 0) {
            const pdfs = mediaByType['pdf']
                .map(media => `[📄 ${media.description}](${media.url})`)
                .join('\n- ')
            linkSections.push(`\n\n**Dokumente:**\n- ${pdfs}`)
        }
    }

    return response + linkSections.join('')
  }

  public generateResponse(handler: HandlerConfig, query: string): string {
    if (!handler.settings.dynamicResponses) {
      // Fallback auf statische Antwort
      const response = handler.responses.find(r => r.type === 'standard')
      return response?.content || 'Leider kann ich dazu keine Information finden.'
    }

    // Wähle Response-Typ basierend auf der Anfrage-Komplexität
    const isDetailedQuery = query.length > 50 || query.includes('detail') || query.includes('genau')
    const responseType = isDetailedQuery ? 'detailed' : 'dynamic'

    const response = handler.responses.find(r => r.type === responseType)
    if (!response || !response.templates || !response.facts) {
      return 'Entschuldigung, ich kann diese Frage momentan nicht beantworten.'
    }

    const template = this.getRandomTemplate(response.templates)
    return this.formatResponse(
      template, 
      response.facts, 
      response.additionalFacts,
      handler.settings.includeLinks ? response.links : undefined
    )
  }
} 