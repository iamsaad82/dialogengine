import { OpenAI } from 'openai';
import { ProcessedDocument } from '../document/types';
import { HandlerConfig, TemplateConfig, ExtractorConfig, SectionDefinition, HandlerMetadata } from '../../types/template';
import { MonitoringService } from '../../monitoring/monitoring';

export class TemplateBasedHandlerGenerator {
  private templates: Map<string, TemplateConfig>;
  private openai: OpenAI;
  private monitoring: MonitoringService;

  constructor(openaiApiKey: string, monitoring: MonitoringService) {
    this.templates = new Map();
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.monitoring = monitoring;
  }

  async registerTemplate(config: TemplateConfig) {
    try {
      this.validateTemplateConfig(config);
      this.templates.set(config.id, config);
      console.log(`[TemplateBasedHandlerGenerator] Template ${config.id} erfolgreich registriert`);
    } catch (error) {
      console.error(`[TemplateBasedHandlerGenerator] Fehler bei der Template-Registrierung:`, error);
      throw error;
    }
  }

  private validateTemplateConfig(config: TemplateConfig) {
    if (!config.id || !config.name || !config.version) {
      throw new Error('Template muss id, name und version enthalten');
    }

    if (!config.structure || !config.structure.patterns || !config.structure.sections) {
      throw new Error('Template muss eine gültige Struktur definieren');
    }

    // Validiere required patterns
    const requiredPatterns = config.structure.patterns.filter(p => p.required);
    if (requiredPatterns.length === 0) {
      throw new Error('Template muss mindestens ein required pattern definieren');
    }
  }

  async generateHandler(document: ProcessedDocument, templateId: string): Promise<HandlerConfig> {
    console.log(`[TemplateBasedHandlerGenerator] Generiere Handler für Template ${templateId}`);
    
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} nicht gefunden`);
    }

    try {
      const startTime = Date.now();
      
      // Extrahiere Metadaten und Sektionen
      const metadata = await this.extractMetadata(document, template);
      const sections = await this.extractSections(document, template);
      
      // Generiere Handler-Konfiguration
      const handler: HandlerConfig = {
        type: document.metadata.type,
        metadata: {
          ...metadata,
          sections,
          keyTopics: [],  // Wird später gefüllt
          entities: [],   // Wird später gefüllt
          facts: []       // Wird später gefüllt
        } as HandlerMetadata,
        settings: {
          matchThreshold: 0.7,
          contextWindow: 3,
          maxTokens: 150,
          dynamicResponses: true,
          includeLinks: true,
          ...template.handlerConfig.customSettings
        },
        responses: await this.generateResponses(document, template)
      };

      const duration = (Date.now() - startTime) / 1000;
      console.log(`[TemplateBasedHandlerGenerator] Handler generiert (${duration}s)`);
      
      return handler;
    } catch (error) {
      console.error(`[TemplateBasedHandlerGenerator] Fehler bei der Handler-Generierung:`, error);
      this.monitoring.recordError('template_handler_generation', error instanceof Error ? error.message : 'Unbekannter Fehler');
      throw error;
    }
  }

  private async extractMetadata(document: ProcessedDocument, template: TemplateConfig) {
    console.log(`[TemplateBasedHandlerGenerator] Extrahiere Metadaten`);
    const metadata: Record<string, any> = {};
    
    for (const def of template.structure.metadata) {
      try {
        if (def.pattern) {
          const match = document.content.match(new RegExp(def.pattern));
          if (match) {
            metadata[def.name] = this.convertType(match[1], def.type);
          } else if (def.required) {
            console.warn(`[TemplateBasedHandlerGenerator] Required metadata ${def.name} nicht gefunden`);
            metadata[def.name] = def.defaultValue;
          }
        }
      } catch (error) {
        console.error(`[TemplateBasedHandlerGenerator] Fehler bei der Metadaten-Extraktion für ${def.name}:`, error);
        if (def.required) {
          throw error;
        }
      }
    }

    return metadata;
  }

  private convertType(value: string, type: string) {
    switch (type) {
      case 'string':
        return value;
      case 'string[]':
        return value.split(',').map(s => s.trim());
      case 'date':
        return new Date(value);
      case 'boolean':
        return value.toLowerCase() === 'true';
      case 'number':
        return Number(value);
      default:
        return value;
    }
  }

  private async extractSections(document: ProcessedDocument, template: TemplateConfig) {
    console.log(`[TemplateBasedHandlerGenerator] Extrahiere Sektionen`);
    const sections: Record<string, any> = {};
    
    for (const section of template.structure.sections) {
      try {
        const content = this.extractSection(document.content, section);
        if (content) {
          sections[section.name] = await this.processSection(content, section, template);
        } else if (section.required) {
          console.warn(`[TemplateBasedHandlerGenerator] Required section ${section.name} nicht gefunden`);
        }
      } catch (error) {
        console.error(`[TemplateBasedHandlerGenerator] Fehler bei der Sektion ${section.name}:`, error);
        if (section.required) {
          throw error;
        }
      }
    }

    return sections;
  }

  private extractSection(content: string, section: SectionDefinition): string | null {
    const startRegex = new RegExp(section.startPattern, 'm');
    const endRegex = new RegExp(section.endPattern, 'm');
    
    const startMatch = content.match(startRegex);
    if (!startMatch) return null;
    
    const startIndex = startMatch.index! + startMatch[0].length;
    const remainingContent = content.slice(startIndex);
    
    const endMatch = remainingContent.match(endRegex);
    const endIndex = endMatch ? endMatch.index! : remainingContent.length;
    
    return remainingContent.slice(0, endIndex).trim();
  }

  private async processSection(content: string, section: SectionDefinition, template: TemplateConfig) {
    if (!section.extractors) return content;

    const results: Record<string, any> = {};
    
    for (const extractorName of section.extractors) {
      const extractor = template.structure.extractors.find(e => e.name === extractorName);
      if (extractor) {
        results[extractorName] = await this.runExtractor(content, extractor);
      }
    }

    return results;
  }

  private async runExtractor(content: string, config: ExtractorConfig) {
    try {
      switch (config.type) {
        case 'regex':
          return this.runRegexExtractor(content, config.config as Record<string, string>);
        case 'ai':
          return this.runAIExtractor(content, config.config as {
            prompt: string;
            model?: string;
            temperature?: number;
          });
        case 'custom':
          return this.runCustomExtractor(content, config.config);
        default:
          throw new Error(`Unbekannter Extraktor-Typ: ${config.type}`);
      }
    } catch (error) {
      console.error(`[TemplateBasedHandlerGenerator] Fehler beim Extraktor ${config.name}:`, error);
      throw error;
    }
  }

  private runRegexExtractor(content: string, config: Record<string, string>): Record<string, string[]> {
    const results: Record<string, string[]> = {};
    
    for (const [key, pattern] of Object.entries(config)) {
      const matches = Array.from(content.matchAll(new RegExp(pattern, 'g')))
        .map(match => match[1] || match[0]);
      results[key] = matches;
    }
    
    return results;
  }

  private async runAIExtractor(content: string, config: {
    prompt: string;
    model?: string;
    temperature?: number;
  }) {
    const { prompt, model = 'gpt-3.5-turbo', temperature = 0.3 } = config;
    
    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: prompt
        },
        {
          role: 'user',
          content
        }
      ],
      temperature,
      response_format: { type: 'json_object' }
    });

    if (!response.choices[0].message.content) {
      throw new Error('Keine Antwort vom AI-Extraktor erhalten');
    }

    return JSON.parse(response.choices[0].message.content);
  }

  private async runCustomExtractor(content: string, config: Record<string, any>) {
    // Implementierung für benutzerdefinierte Extraktoren
    // Hier können spezielle Extraktoren registriert werden
    return {};
  }

  private async generateResponses(document: ProcessedDocument, template: TemplateConfig) {
    const responses = [];
    
    for (const type of template.handlerConfig.responseTypes) {
      responses.push({
        type,
        templates: await this.generateTemplatesForType(type, document, template),
        facts: await this.extractFactsForType(type, document, template),
        context: `Response type: ${type}`
      });
    }
    
    return responses;
  }

  private async generateTemplatesForType(type: string, document: ProcessedDocument, template: TemplateConfig) {
    // Basis-Templates für jeden Typ
    const baseTemplates = [
      `Hier sind die wichtigsten Informationen zu {{topic}}: {{facts}}`,
      `Zu {{topic}} kann ich Ihnen Folgendes mitteilen: {{facts}}`,
      `Die wichtigsten Punkte zu {{topic}}: {{facts}}`
    ];

    // Typ-spezifische Templates können hier hinzugefügt werden
    return baseTemplates;
  }

  private async extractFactsForType(type: string, document: ProcessedDocument, template: TemplateConfig) {
    // Implementierung der typ-spezifischen Faktenextraktion
    return [];
  }
} 