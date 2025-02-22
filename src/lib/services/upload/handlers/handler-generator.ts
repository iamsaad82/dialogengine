import { Logger } from '@/lib/utils/logger'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'
import { BaseContentTypes } from '@/lib/types/contentTypes'
import { 
  TopicSection,
  TopicCluster,
  HandlerMetadata,
  HandlerConfig,
  TopicMetadata
} from '@/lib/types/upload/index'

export class HandlerGenerator {
  private logger: Logger

  constructor() {
    this.logger = new Logger('HandlerGenerator')
  }

  /**
   * Generiert oder aktualisiert Handler für die erkannten Themenbereiche
   */
  public async generateHandlersForTopics(
    templateId: string,
    sections: TopicSection[],
    existingHandlers: any[]
  ): Promise<string[]> {
    this.logger.info('Generiere Handler für Themenbereiche...')
    const clusters = await this.clusterTopics(sections)
    const handlerIds: string[] = []
    
    for (const cluster of clusters) {
      // Suche nach ähnlichem existierenden Handler
      const similarHandler = this.findSimilarHandler(cluster, existingHandlers, templateId)
      
      if (similarHandler) {
        const handlerId = await this.updateExistingHandler(similarHandler, cluster)
        handlerIds.push(handlerId)
      } else {
        const handlerId = await this.createNewHandler(templateId, cluster)
        handlerIds.push(handlerId)
      }
    }
    
    this.logger.info(`${handlerIds.length} Handler generiert/aktualisiert`)
    return handlerIds
  }

  /**
   * Findet einen ähnlichen existierenden Handler
   */
  private findSimilarHandler(
    cluster: TopicCluster,
    existingHandlers: any[],
    templateId: string
  ): any {
    return existingHandlers.find(handler => {
      try {
        const handlerMeta = this.safeJSONParse<HandlerMetadata>(handler.metadata as string, {})
        const handlerConfig = this.safeJSONParse<HandlerConfig>(handler.config as string, {
          capabilities: [],
          patterns: [],
          metadata: {
            domain: '',
            subDomain: '',
            keywords: [],
            coverage: [],
            relationships: {
              relatedTopics: []
            }
          },
          settings: {
            matchThreshold: 0.8,
            contextWindow: 1000,
            maxTokens: 2000,
            dynamicResponses: true
          }
        })
        
        // Erweiterte Ähnlichkeitsprüfung
        const domainMatch = handlerMeta.suggestedMetadata?.domain === cluster.metadata.domain
        const subDomainMatch = handlerMeta.suggestedMetadata?.subDomain === cluster.metadata.subDomain
        
        const keywords = new Set([
          ...(handlerConfig.metadata?.keywords || []),
          ...cluster.metadata.keywords
        ])
        const keywordOverlap = keywords.size < (
          (handlerConfig.metadata?.keywords?.length || 0) +
          cluster.metadata.keywords.length
        )
        
        return (
          handler.templateId === templateId &&
          (domainMatch || subDomainMatch || keywordOverlap)
        )
      } catch (error: any) {
        this.logger.error('Fehler beim Parsen der Handler-Daten:', error)
        return false
      }
    })
  }

  /**
   * Aktualisiert einen existierenden Handler
   */
  private async updateExistingHandler(
    handler: any,
    cluster: TopicCluster
  ): Promise<string> {
    const handlerConfig = this.safeJSONParse<HandlerConfig>(handler.config as string, {
      capabilities: [],
      patterns: [],
      metadata: {
        domain: '',
        subDomain: '',
        keywords: [],
        coverage: [],
        relationships: {
          relatedTopics: []
        }
      },
      settings: {
        matchThreshold: 0.8,
        contextWindow: 1000,
        maxTokens: 2000,
        dynamicResponses: true
      }
    })
    const handlerMeta = this.safeJSONParse<HandlerMetadata>(handler.metadata as string, {})
    
    const updatedConfig = {
      ...handlerConfig,
      metadata: {
        ...handlerConfig.metadata,
        keywords: Array.from(new Set([
          ...(handlerConfig.metadata?.keywords || []),
          ...cluster.metadata.keywords
        ])),
        coverage: Array.from(new Set([
          ...(handlerConfig.metadata?.coverage || []),
          ...cluster.metadata.coverage
        ])),
        relationships: {
          ...handlerConfig.metadata?.relationships,
          relatedTopics: Array.from(new Set([
            ...(handlerConfig.metadata?.relationships?.relatedTopics || []),
            ...cluster.metadata.relationships.relatedTopics
          ]))
        }
      }
    }
    
    await prisma.template_handlers.update({
      where: { id: handler.id },
      data: {
        config: JSON.stringify(updatedConfig),
        metadata: JSON.stringify({
          ...handlerMeta,
          lastUpdate: new Date().toISOString(),
          documentCount: (handlerMeta.documentCount || 1) + 1
        })
      }
    })
    
    this.logger.info(`Handler ${handler.id} aktualisiert`)
    return handler.id
  }

  /**
   * Erstellt einen neuen Handler
   */
  private async createNewHandler(
    templateId: string,
    cluster: TopicCluster
  ): Promise<string> {
    const handlerId = nanoid()
    const capabilities = ['suche', 'extraktion']
    
    // Füge spezifische Capabilities basierend auf dem Content-Type hinzu
    if (cluster.mainTopic.type === BaseContentTypes.SERVICE) capabilities.push('dienstleistung')
    if (cluster.mainTopic.type === BaseContentTypes.PRODUCT) capabilities.push('produkt')
    if (cluster.mainTopic.type === BaseContentTypes.FAQ) capabilities.push('faq')
    if (cluster.mainTopic.type === BaseContentTypes.CONTACT) capabilities.push('kontakt')
    if (cluster.mainTopic.type === BaseContentTypes.EVENT) capabilities.push('veranstaltung')
    
    const handler = await prisma.template_handlers.create({
      data: {
        id: handlerId,
        templateId,
        type: cluster.mainTopic.type,
        name: `${cluster.metadata.domain} - ${cluster.metadata.subDomain}`,
        active: true,
        config: JSON.stringify({
          capabilities,
          patterns: [], // Wird aus dem Content generiert
          metadata: {
            domain: cluster.metadata.domain,
            subDomain: cluster.metadata.subDomain,
            keywords: cluster.metadata.keywords.map(k => k.toLowerCase()),
            coverage: cluster.metadata.coverage.map(c => c.toLowerCase()),
            relationships: {
              relatedTopics: cluster.metadata.relationships.relatedTopics.map(t => t.toLowerCase())
            }
          },
          settings: {
            matchThreshold: 0.8,
            contextWindow: 1000,
            maxTokens: 2000,
            dynamicResponses: true,
            includeLinks: cluster.mainTopic.type === BaseContentTypes.DOWNLOAD,
            includeContact: cluster.mainTopic.type === BaseContentTypes.CONTACT,
            includeSteps: cluster.mainTopic.type === BaseContentTypes.SERVICE || cluster.mainTopic.type === BaseContentTypes.PRODUCT,
            includePrice: cluster.mainTopic.type === BaseContentTypes.PRODUCT || cluster.mainTopic.type === BaseContentTypes.SERVICE,
            includeAvailability: cluster.mainTopic.type === BaseContentTypes.EVENT || cluster.mainTopic.type === BaseContentTypes.SERVICE,
            useExactMatches: cluster.confidence > 0.9
          }
        }),
        metadata: JSON.stringify({
          generated: true,
          timestamp: new Date().toISOString(),
          documentCount: 1,
          suggestedMetadata: {
            domain: cluster.metadata.domain,
            subDomain: cluster.metadata.subDomain,
            keywords: cluster.metadata.keywords.map(k => k.toLowerCase()),
            coverage: cluster.metadata.coverage.map(c => c.toLowerCase()),
            relationships: {
              relatedTopics: cluster.metadata.relationships.relatedTopics.map(t => t.toLowerCase())
            }
          }
        })
      }
    })
    
    this.logger.info(`Neuer Handler ${handlerId} erstellt`)
    return handler.id
  }

  /**
   * Gruppiert ähnliche Themen in Cluster
   */
  private async clusterTopics(sections: TopicSection[]): Promise<TopicCluster[]> {
    this.logger.info('Gruppiere ähnliche Themen...')
    const clusters: TopicCluster[] = []
    const processedSections = new Set<number>()
    
    // Sortiere Sections nach Confidence absteigend
    const sortedSections = [...sections].sort((a, b) => b.confidence - a.confidence)
    
    for (let i = 0; i < sortedSections.length; i++) {
      if (processedSections.has(i)) continue
      
      const mainTopic = sortedSections[i]
      const relatedTopics: TopicSection[] = []
      
      // Suche ähnliche Themen
      for (let j = 0; j < sortedSections.length; j++) {
        if (i === j || processedSections.has(j)) continue
        
        const similarity = this.calculateTopicSimilarity(mainTopic, sortedSections[j])
        if (similarity >= 0.7) { // Schwellenwert für Ähnlichkeit
          relatedTopics.push(sortedSections[j])
          processedSections.add(j)
        }
      }
      
      // Erstelle Cluster
      clusters.push({
        mainTopic,
        relatedTopics,
        confidence: mainTopic.confidence,
        metadata: {
          domain: mainTopic.metadata.domain,
          subDomain: mainTopic.metadata.subDomain,
          keywords: Array.from(new Set([
            ...mainTopic.metadata.keywords,
            ...relatedTopics.flatMap(t => t.metadata.keywords)
          ])),
          coverage: Array.from(new Set([
            ...mainTopic.metadata.coverage,
            ...relatedTopics.flatMap(t => t.metadata.coverage)
          ])),
          relationships: {
            relatedTopics: Array.from(new Set([
              ...(mainTopic.metadata.relationships?.relatedTopics || []),
              ...relatedTopics.flatMap(t => t.metadata.relationships?.relatedTopics || [])
            ]))
          }
        }
      })
      
      processedSections.add(i)
    }
    
    this.logger.info(`${clusters.length} Themen-Cluster erstellt`)
    return clusters
  }

  /**
   * Berechnet die Ähnlichkeit zwischen zwei Themen
   */
  private calculateTopicSimilarity(topic1: TopicSection, topic2: TopicSection): number {
    let similarity = 0
    
    // Domain-Übereinstimmung
    if (topic1.metadata.domain === topic2.metadata.domain) similarity += 0.3
    if (topic1.metadata.subDomain === topic2.metadata.subDomain) similarity += 0.2
    
    // Keyword-Überlappung
    const keywords1 = new Set(topic1.metadata.keywords)
    const keywords2 = new Set(topic2.metadata.keywords)
    const commonKeywords = new Set([...keywords1].filter(x => keywords2.has(x)))
    similarity += 0.3 * (commonKeywords.size / Math.max(keywords1.size, keywords2.size))
    
    // Coverage-Überlappung
    const coverage1 = new Set(topic1.metadata.coverage)
    const coverage2 = new Set(topic2.metadata.coverage)
    const commonCoverage = new Set([...coverage1].filter(x => coverage2.has(x)))
    similarity += 0.2 * (commonCoverage.size / Math.max(coverage1.size, coverage2.size))
    
    return similarity
  }

  /**
   * Sicheres JSON-Parsing mit Fallback
   */
  private safeJSONParse<T>(value: string | null | undefined, defaultValue: T): T {
    if (!value) return defaultValue
    try {
      const parsed = JSON.parse(value)
      return parsed as T
    } catch (error) {
      this.logger.warn('Fehler beim JSON-Parsing:', error)
      return defaultValue
    }
  }
} 