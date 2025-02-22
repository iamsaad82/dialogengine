import { Logger } from '@/lib/utils/logger'
import { ContentDetector } from '@/lib/services/detector'
import { OpenAIService } from '@/lib/services/ai/openai'
import { BaseContentTypes } from '@/lib/types/contentTypes'
import { 
  ContentAnalysis as IContentAnalysis,
  TopicSection,
  TopicCluster,
  ContentPattern,
  ContentField,
  ContentSection,
  ContentMetadata
} from '@/lib/types/upload/analysis'

export class ContentAnalyzer {
  private logger: Logger
  private detector: ContentDetector

  constructor(private openai: OpenAIService) {
    this.logger = new Logger('ContentAnalyzer')
    this.detector = new ContentDetector(openai)
  }

  /**
   * Analysiert den Inhalt und erkennt verschiedene Themenbereiche
   */
  public async detectTopicSections(content: string): Promise<TopicSection[]> {
    try {
      this.logger.info('Erkenne Themenbereiche...')
      const sections = await this.openai.detectSections(content)
      
      return sections.map((section, index) => ({
        id: `section_${index + 1}`,
        type: BaseContentTypes.DEFAULT,
        title: section.title,
        content: section.content,
        confidence: 1,
        metadata: {
          domain: '',
          subDomain: '',
          keywords: [],
          coverage: [],
          relationships: {
            relatedTopics: []
          }
        }
      }))
    } catch (error) {
      this.logger.error('Fehler bei der Themenerkennung:', error instanceof Error ? error : new Error('Unbekannter Fehler'))
      throw error
    }
  }

  /**
   * Extrahiert einen Titel aus dem Content
   */
  private extractTitle(content: string): string {
    const lines = content.split('\n')
    const firstLine = lines[0].trim()
    
    // Wenn die erste Zeile kurz genug ist, verwende sie als Titel
    if (firstLine.length <= 100) {
      return firstLine
    }
    
    // Sonst erstelle einen Titel aus den ersten Worten
    return firstLine.split(' ').slice(0, 5).join(' ') + '...'
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
   * Gruppiert ähnliche Themen in Cluster
   */
  public async clusterTopics(sections: TopicSection[]): Promise<TopicCluster[]> {
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
   * Analysiert den gesamten Content und gibt detaillierte Ergebnisse zurück
   */
  public async analyzeContent(content: string): Promise<IContentAnalysis> {
    try {
      const sections = await this.detectTopicSections(content)
      const patterns = await this.openai.extractPatterns(content)
      const fields = await this.openai.extractFields(content)
      const analysisResult = await this.openai.analyzeContent(content)
      const type = analysisResult.type
      const confidence = analysisResult.confidence

      return {
        type,
        confidence,
        patterns: patterns.map(p => ({
          title: p.title,
          description: p.description,
          regex: p.regex,
          confidence: p.confidence,
          matches: []
        })),
        fields: fields.map(f => ({
          name: f.name,
          type: f.type,
          required: f.required,
          description: f.description,
          value: f.value
        })),
        sections: sections.map(s => ({
          title: s.title,
          content: s.content,
          type: s.type
        })),
        metadata: {
          domain: analysisResult.metadata.domain,
          subDomain: analysisResult.metadata.subDomain,
          relatedTopics: analysisResult.metadata.relatedTopics || [],
          coverage: analysisResult.metadata.coverage || [],
          provider: analysisResult.metadata.provider,
          serviceType: analysisResult.metadata.serviceType,
          requirements: analysisResult.metadata.requirements || [],
          nextSteps: analysisResult.metadata.nextSteps || [],
          deadlines: analysisResult.metadata.deadlines || [],
          contactPoints: analysisResult.metadata.contactPoints || [],
          media: analysisResult.metadata.media || {},
          interactive: analysisResult.metadata.interactive || {}
        }
      }
    } catch (error) {
      this.logger.error('Fehler bei der Inhaltsanalyse:', error instanceof Error ? error : new Error('Unbekannter Fehler'))
      throw error
    }
  }
} 