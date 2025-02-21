import { Template } from '@/lib/types/template'
import { DocumentLinks } from '../document/types'
import { HandlerManager } from '../search/handlers/manager'
import { prisma } from '@/lib/prisma'
import { HandlerConfig } from '@/lib/types/handler'
import { ParsedBot, SmartSearchConfig, FlowiseBotConfig } from '@/lib/types/bot'
import { Fact, ResponseContext } from '@/lib/types/facts'

interface BotServiceConfig {
  openaiApiKey: string
  pineconeApiKey: string
  pineconeEnvironment?: string
  pineconeIndex?: string
}

export class BotService {
  private handlerManager?: HandlerManager

  constructor(config?: BotServiceConfig) {
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

    if (!template || !template.bot_config) {
      throw new Error('Template or bot configuration not found')
    }

    const botConfig = JSON.parse(template.bot_config.toString()) as ParsedBot

    // Verarbeite Nachricht basierend auf Bot-Typ
    switch (botConfig.type) {
      case 'template-handler':
        return this.processTemplateMessage(message, templateId, history)
      
      case 'examples':
        return this.processExampleMessage(message, botConfig.examples || [])
      
      case 'flowise':
        if (!botConfig.config || typeof botConfig.config !== 'object') {
          throw new Error('Flowise configuration missing')
        }
        const flowiseConfig = botConfig.config as FlowiseBotConfig
        return this.processFlowiseMessage(message, {
          chatflowId: flowiseConfig.flowId,
          apiHost: flowiseConfig.apiHost,
          apiKey: flowiseConfig.apiKey
        })
      
      case 'smart-search':
        if (!botConfig.config || typeof botConfig.config !== 'object') {
          throw new Error('Smart search configuration missing')
        }
        return this.processSmartSearchMessage(message, botConfig.config)
      
      default:
        throw new Error(`Unsupported bot type: ${botConfig.type}`)
    }
  }

  private async processTemplateMessage(
    message: string,
    templateId: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  ) {
    if (!this.handlerManager) {
      throw new Error('HandlerManager not initialized')
    }

    const response = await this.handlerManager.processRequest({
      query: message,
      type: 'template',
      metadata: {
        history,
        templateId
      }
    })

    // Extrahiere Links und Medien aus den Quellen
    const links = this.extractLinksFromSources(response.metadata?.sources || [])

    return {
      text: response.text,
      type: response.metadata?.category,
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
    try {
      const response = await fetch(`${flowiseConfig.apiHost}/api/v1/prediction/${flowiseConfig.chatflowId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${flowiseConfig.apiKey}`
        },
        body: JSON.stringify({
          question: message
        })
      })

      if (!response.ok) {
        throw new Error('Flowise API error')
      }

      const data = await response.json()
      return {
        text: data.text || data.answer || 'Keine Antwort erhalten',
        type: 'info',
        metadata: data.metadata || {}
      }
    } catch (error) {
      console.error('Flowise processing error:', error)
      return {
        text: 'Entschuldigung, es gab einen Fehler bei der Verarbeitung Ihrer Anfrage.',
        type: 'error'
      }
    }
  }

  private async processSmartSearchMessage(
    message: string,
    searchConfig: ParsedBot['config']
  ) {
    if (!this.handlerManager) {
      throw new Error('HandlerManager not initialized')
    }

    try {
      const response = await this.handlerManager.processRequest({
        query: message,
        type: 'smart-search',
        metadata: {
          config: searchConfig
        }
      })

      return {
        text: response.text,
        type: response.metadata?.category || 'info',
        metadata: response.metadata
      }
    } catch (error) {
      console.error('Smart search processing error:', error)
      return {
        text: 'Entschuldigung, es gab einen Fehler bei der Suche.',
        type: 'error'
      }
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

  public async generateResponse(handler: HandlerConfig, query: string): Promise<string> {
    if (!handler.config?.settings?.dynamicResponses) {
      // Fallback auf statische Antwort
      return 'Leider kann ich dazu keine Information finden.'
    }

    // Wähle Response-Typ basierend auf der Anfrage-Komplexität
    const isDetailedQuery = query.length > 50 || query.includes('detail') || query.includes('genau')
    
    return isDetailedQuery ? 
      await this.generateDetailedResponse(handler, query) :
      await this.generateSimpleResponse(handler, query)
  }

  private async generateDetailedResponse(handler: HandlerConfig, query: string): Promise<string> {
    // Implementierung der detaillierten Antwortgenerierung
    const facts = await this.extractRelevantFacts(handler, query)
    const context = await this.buildResponseContext(handler, facts)
    
    return this.formatDetailedResponse(context, {
      includeLinks: handler.config.settings.includeLinks,
      includeSteps: handler.config.settings.includeSteps,
      includePrice: handler.config.settings.includePrice,
      includeContact: handler.config.settings.includeContact
    })
  }

  private async generateSimpleResponse(handler: HandlerConfig, query: string): Promise<string> {
    // Implementierung der einfachen Antwortgenerierung
    const mainFact = await this.extractMainFact(handler, query)
    return this.formatSimpleResponse(mainFact, {
      includeLinks: handler.config.settings.includeLinks
    })
  }

  private async extractRelevantFacts(handler: HandlerConfig, query: string): Promise<Fact[]> {
    if (!this.handlerManager) {
      throw new Error('HandlerManager not initialized')
    }

    try {
      // Hole relevante Chunks aus dem Vector Store
      const response = await this.handlerManager.processRequest({
        query,
        type: 'fact-extraction',
        metadata: {
          handlerId: handler.id,
          settings: handler.config.settings
        }
      })

      // Konvertiere die Chunks in Fakten
      return response.metadata?.sources?.map((source: any) => ({
        id: source.id || crypto.randomUUID(),
        type: source.metadata?.type || 'info',
        description: source.text,
        confidence: source.score || 1.0,
        source: source.url,
        metadata: {
          category: source.metadata?.category,
          subcategory: source.metadata?.subcategory,
          tags: source.metadata?.tags,
          relevance: source.score,
          context: source.metadata?.context,
          name: source.metadata?.name,
          phone: source.metadata?.phone,
          email: source.metadata?.email,
          address: source.metadata?.address,
          hours: source.metadata?.hours
        },
        links: source.metadata?.links?.map((link: any) => ({
          url: link.url,
          title: link.title,
          type: link.type || 'external'
        }))
      })) || []
    } catch (error) {
      console.error('Error extracting facts:', error)
      return []
    }
  }

  private async extractMainFact(handler: HandlerConfig, query: string): Promise<Fact> {
    const facts = await this.extractRelevantFacts(handler, query)
    
    // Wähle den relevantesten Fakt
    const mainFact = facts.reduce((best, current) => {
      const bestScore = best.metadata?.relevance || 0
      const currentScore = current.metadata?.relevance || 0
      return currentScore > bestScore ? current : best
    }, facts[0] || {
      id: crypto.randomUUID(),
      type: 'info',
      description: 'Keine relevante Information gefunden.',
      confidence: 0.5
    })

    return mainFact
  }

  private async buildResponseContext(handler: HandlerConfig, facts: Fact[]): Promise<ResponseContext> {
    // Extrahiere Metadaten aus den Fakten
    const priceInfo = facts.find(f => f.metadata?.category === 'price')
    const contactInfo = facts.find(f => f.metadata?.category === 'contact')
    const stepsInfo = facts.filter(f => f.metadata?.category === 'steps')

    return {
      facts,
      metadata: handler.metadata || {},
      settings: handler.config.settings,
      steps: stepsInfo.map(f => f.description),
      price: priceInfo ? {
        amount: parseFloat(priceInfo.description.match(/\d+(\.\d+)?/)?.[0] || '0'),
        currency: priceInfo.description.match(/[€$]/)?.[0] || '€',
        description: priceInfo.description
      } : undefined,
      contact: contactInfo?.metadata ? {
        name: contactInfo.metadata.name || '',
        phone: contactInfo.metadata.phone || '',
        email: contactInfo.metadata.email || '',
        address: contactInfo.metadata.address,
        hours: contactInfo.metadata.hours
      } : undefined
    }
  }

  private formatDetailedResponse(context: ResponseContext, options: {
    includeLinks?: boolean
    includeSteps?: boolean
    includePrice?: boolean
    includeContact?: boolean
  }): string {
    let response = ''

    // Hauptinformationen
    if (context.facts.length > 0) {
      response += context.facts
        .map(fact => fact.description)
        .join('\n\n')
    }

    // Optionale Informationen
    if (options.includeSteps && context.steps) {
      response += '\n\n**Nächste Schritte:**\n'
      response += context.steps.join('\n')
    }

    if (options.includePrice && context.price) {
      response += `\n\n**Kosten:** ${context.price.amount} ${context.price.currency}`
      if (context.price.description) {
        response += `\n${context.price.description}`
      }
    }

    if (options.includeContact && context.contact) {
      response += '\n\n**Kontakt:**\n'
      response += `${context.contact.name}\n`
      response += `Tel: ${context.contact.phone}\n`
      response += `E-Mail: ${context.contact.email}`
      if (context.contact.address) {
        response += `\nAdresse: ${context.contact.address}`
      }
      if (context.contact.hours) {
        response += `\nÖffnungszeiten: ${context.contact.hours}`
      }
    }

    return response
  }

  private formatSimpleResponse(mainFact: any, options: {
    includeLinks?: boolean
  }): string {
    // Formatiere einfache Antwort
    let response = mainFact.description || ''

    if (options.includeLinks && mainFact.links) {
      response += '\n\nMehr Informationen: ' + mainFact.links[0]
    }

    return response
  }
} 