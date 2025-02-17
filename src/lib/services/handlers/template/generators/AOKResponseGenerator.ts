import { HandlerResponse } from '../../../../types/template';
import { ProcessedDocument, DocumentLinks } from '../../../document/types';
import { AOKFactExtractor } from '../extractors/AOKFactExtractor';
import { MonitoringService } from '../../../../monitoring/monitoring';

interface TemplateMetadata {
  links?: DocumentLinks;
  [key: string]: unknown;
}

export class AOKResponseGenerator {
  private factExtractor: AOKFactExtractor;
  private monitoring: MonitoringService;

  constructor(openaiApiKey: string, monitoring: MonitoringService) {
    this.factExtractor = new AOKFactExtractor(openaiApiKey, monitoring);
    this.monitoring = monitoring;
  }

  async generateResponses(document: ProcessedDocument): Promise<HandlerResponse[]> {
    try {
      console.log('[AOKResponseGenerator] Generiere Antworten');
      
      // Extrahiere Fakten für verschiedene Antworttypen
      const [standardFacts, detailedFacts, contactFacts] = await Promise.all([
        this.factExtractor.extractFacts(document, 'standard'),
        this.factExtractor.extractFacts(document, 'detailed'),
        this.factExtractor.extractFacts(document, 'contact')
      ]);

      const responses: HandlerResponse[] = [];
      const metadata = document.metadata.templateMetadata as TemplateMetadata;

      // Standard-Antwort
      responses.push({
        type: 'standard',
        templates: this.getStandardTemplates(),
        facts: standardFacts,
        context: 'Standardantwort mit den wichtigsten Informationen',
        links: this.filterRelevantLinks(metadata.links, standardFacts)
      });

      // Detaillierte Antwort
      responses.push({
        type: 'detailed',
        templates: this.getDetailedTemplates(),
        facts: detailedFacts,
        context: 'Ausführliche Antwort mit allen Details',
        links: this.filterRelevantLinks(metadata.links, detailedFacts)
      });

      // Kontakt-Antwort
      if (contactFacts.length > 0) {
        responses.push({
          type: 'contact',
          templates: this.getContactTemplates(),
          facts: contactFacts,
          context: 'Kontaktinformationen und Erreichbarkeit'
        });
      }

      return responses;
    } catch (error) {
      console.error('[AOKResponseGenerator] Fehler bei der Antwortgenerierung:', error);
      this.monitoring.recordError('response_generation', error instanceof Error ? error.message : 'Unbekannter Fehler');
      
      // Fallback: Einfache Standardantwort
      return [{
        type: 'standard',
        templates: this.getStandardTemplates(),
        facts: ['Leider konnte ich keine spezifischen Informationen extrahieren.'],
        context: 'Fallback-Antwort aufgrund eines Fehlers'
      }];
    }
  }

  private getStandardTemplates(): string[] {
    return [
      'Zu dieser AOK-Leistung kann ich Ihnen folgende Informationen geben: {{facts}}',
      'Die AOK bietet hier folgende Möglichkeiten: {{facts}}',
      'Als AOK-Versicherte/r haben Sie folgende Vorteile: {{facts}}',
      'Diese AOK-Leistung umfasst: {{facts}}',
      'Im Rahmen Ihrer AOK-Versicherung gilt: {{facts}}'
    ];
  }

  private getDetailedTemplates(): string[] {
    return [
      'Hier sind alle Details zu dieser AOK-Leistung:\n{{facts}}\n\nWeitere wichtige Informationen:\n{{additionalFacts}}',
      'Als AOK-Versicherte/r profitieren Sie von folgenden Leistungen:\n{{facts}}\n\nZusätzlich bieten wir:\n{{additionalFacts}}',
      'Diese AOK-Leistung im Detail:\n{{facts}}\n\nErgänzende Informationen:\n{{additionalFacts}}',
      'Im Rahmen des AOK-Leistungskatalogs erhalten Sie:\n{{facts}}\n\nDarüber hinaus wichtig zu wissen:\n{{additionalFacts}}'
    ];
  }

  private getContactTemplates(): string[] {
    return [
      'Ihre AOK ist für Sie da. Sie erreichen uns wie folgt: {{facts}}',
      'Für persönliche Beratung zu dieser Leistung: {{facts}}',
      'Ihre AOK-Ansprechpartner: {{facts}}',
      'Weitere Informationen erhalten Sie: {{facts}}'
    ];
  }

  private filterRelevantLinks(links: DocumentLinks | undefined, facts: string[]): DocumentLinks | undefined {
    if (!links) return undefined;

    const factsText = facts.join(' ').toLowerCase();
    
    return {
      internal: this.filterLinksByRelevance(links.internal, factsText),
      external: this.filterLinksByRelevance(links.external, factsText),
      media: this.filterLinksByRelevance(links.media, factsText)
    };
  }

  private filterLinksByRelevance<T extends { url: string; title?: string; description?: string }>(
    links: T[],
    context: string
  ): T[] {
    return links.filter(link => {
      const linkText = [
        link.title,
        link.description,
        link.url
      ].filter(Boolean).join(' ').toLowerCase();

      // Prüfe, ob wichtige Wörter aus dem Link im Kontext vorkommen
      const words = linkText.split(/\W+/).filter(word => word.length > 3);
      return words.some(word => context.includes(word));
    });
  }
} 