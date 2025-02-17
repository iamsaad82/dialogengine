import { ContentMetadata } from '../types/ContentMetadata';
import { HandlerConfig } from '../types/HandlerConfig';
import { BaseHandler } from './BaseHandler';
import { OpenAI } from 'openai';
import { MonitoringService } from '../monitoring/monitoring';
import { medicalValidators } from '../validation/medical';

export class HandlerGenerator {
  private readonly handlerConfigs: Map<string, HandlerConfig> = new Map();
  private readonly openai: OpenAI;
  private readonly monitoring: MonitoringService;
  private readonly validatorMap: Map<string, any> = new Map([
    ['medical', medicalValidators]
  ]);

  constructor(
    openaiApiKey: string,
    monitoring: MonitoringService
  ) {
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.monitoring = monitoring;
  }

  /**
   * Generiert einen neuen Handler basierend auf den Content-Metadaten
   */
  public async generateHandler(metadata: ContentMetadata): Promise<BaseHandler> {
    const startTime = Date.now();
    
    try {
      // Validiere Pflichtfelder
      if (!metadata.title || !metadata.description) {
        throw new Error('Fehlende Pflichtfelder');
      }

      const handlerType = this.determineHandlerType(metadata);
      let config = this.handlerConfigs.get(handlerType);
      
      if (!config) {
        config = await this.generateHandlerConfig(metadata);
        this.handlerConfigs.set(handlerType, config);
      }

      // Füge domänenspezifische Validatoren hinzu
      const validators = this.validatorMap.get(metadata.type);
      if (validators) {
        config.validationRules.customRules = {
          ...config.validationRules.customRules,
          ...this.generateCustomRules(validators)
        };
      }

      const handler = new BaseHandler(config);
      
      // Erfolgreiches Monitoring
      this.monitoring.recordHandlerCall(handlerType, true);
      this.monitoring.recordHandlerLatency(handlerType, (Date.now() - startTime) / 1000);
      
      return handler;
    } catch (error: unknown) {
      // Fehler-Monitoring
      const handlerType = metadata.type || 'unknown';
      this.monitoring.recordHandlerCall(handlerType, false);
      this.monitoring.recordABTestMetrics(handlerType, 'error', {
        error_count: 1.0,
        error_timestamp: Date.now() / 1000
      });
      throw error;
    }
  }

  /**
   * Bestimmt den Handler-Typ basierend auf den Metadaten
   */
  private determineHandlerType(metadata: ContentMetadata): string {
    // Kombiniere Typ und Template für eindeutigen Handler
    const template = metadata.template || 'default';
    return `${metadata.type}_${template}`.toLowerCase();
  }

  /**
   * Generiert eine Handler-Konfiguration basierend auf den Content-Metadaten
   */
  private async generateHandlerConfig(metadata: ContentMetadata): Promise<HandlerConfig> {
    const systemPrompt = `Du bist ein spezialisierter KI-Assistent für die Generierung von Handler-Konfigurationen im DialogEngine-System.

Analysiere die folgenden Content-Metadaten und generiere eine optimale Handler-Konfiguration für den Dialog-Management-Kontext.

Content-Informationen:
- Typ: ${metadata.type}
- Template: ${metadata.template || 'default'}
- Anforderungen: ${Array.isArray(metadata.requirements) ? metadata.requirements.join(', ') : metadata.requirements || 'keine'}
- Zusatzfelder: ${metadata.additionalFields ? JSON.stringify(metadata.additionalFields) : 'keine'}

Berücksichtige bei der Konfiguration:

1. Suchfelder (searchFields):
   - Identifiziere alle relevanten Felder für die semantische Suche
   - Priorisiere Felder nach ihrer Wichtigkeit
   - Berücksichtige Domänen-spezifische Besonderheiten

2. Response-Template:
   - Erstelle ein strukturiertes JSON-Template
   - Nutze {{variable}} für dynamische Inhalte
   - Stelle sicher, dass alle wichtigen Informationen enthalten sind
   - Berücksichtige die Lesbarkeit und Verarbeitbarkeit

3. Validierungsregeln:
   - Definiere sinnvolle Längen-Beschränkungen
   - Identifiziere Pflichtfelder
   - Erstelle domänenspezifische Validierungsmuster
   - Füge spezielle Validierungsregeln für den Content-Typ hinzu

Antworte ausschließlich im folgenden JSON-Format:
{
  "searchFields": string[],
  "responseTemplate": string,
  "validationRules": {
    "minLength": number,
    "maxLength": number,
    "required": string[],
    "pattern": string | null,
    "customRules": {
      "fieldName": {
        "type": "string" | "number" | "boolean",
        "validation": string,
        "errorMessage": string
      }[]
    }
  }
}`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [{
        role: "system",
        content: systemPrompt
      }],
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("Keine Antwort von OpenAI erhalten");
    }

    // Parse und validiere die Konfiguration
    const aiConfig: {
      searchFields: string[];
      responseTemplate: string;
      validationRules: {
        minLength?: number;
        maxLength?: number;
        required: string[];
        pattern: string | null;
        validation?: {
          [key: string]: {
            minLength?: number;
            maxLength?: number;
            pattern?: string;
          };
        };
        customRules?: {
          [key: string]: Array<{
            type: 'string' | 'number' | 'boolean';
            validation: string;
            errorMessage: string;
          }>;
        };
      };
    } = JSON.parse(content);
    this.validateHandlerConfig(aiConfig);

    return {
      type: metadata.type,
      template: metadata.template || 'default',
      searchFields: aiConfig.searchFields || this.extractSearchFields(metadata),
      responseTemplate: aiConfig.responseTemplate || await this.generateDefaultTemplate(metadata),
      validationRules: {
        required: ['title', 'description'],
        type: metadata.type,
        template: metadata.template || 'default',
        validation: aiConfig.validationRules?.validation || {
          query: {
            minLength: 3,
            maxLength: 1000
          }
        },
        customRules: aiConfig.validationRules?.customRules || {
          email: [{
            type: 'string',
            validation: 'isEmail',
            errorMessage: 'Ungültige E-Mail-Adresse'
          }]
        }
      }
    };
  }

  /**
   * Validiert die generierte Handler-Konfiguration
   */
  private validateHandlerConfig(config: any): void {
    // Prüfe searchFields
    if (!Array.isArray(config.searchFields) || config.searchFields.length === 0) {
      throw new Error("Ungültige searchFields in der Handler-Konfiguration");
    }

    // Prüfe responseTemplate
    if (typeof config.responseTemplate !== 'string' || config.responseTemplate.length === 0) {
      throw new Error("Ungültiges responseTemplate in der Handler-Konfiguration");
    }

    // Prüfe validationRules
    if (!config.validationRules || typeof config.validationRules !== 'object') {
      throw new Error("Ungültige validationRules in der Handler-Konfiguration");
    }

    const rules = config.validationRules;
    
    // Prüfe Basis-Validierungsregeln
    if (
      !Array.isArray(rules.required) ||
      typeof rules.type !== 'string' ||
      (rules.template !== undefined && typeof rules.template !== 'string')
    ) {
      throw new Error("Ungültige Basis-Validierungsregeln");
    }

    // Prüfe Feld-Validierungen
    if (!rules.validation || typeof rules.validation !== 'object') {
      throw new Error("Ungültige Feld-Validierungen");
    }

    // Prüfe jede Feld-Validierung
    Object.entries(rules.validation).forEach(([field, fieldRules]) => {
      if (typeof fieldRules !== 'object' || !fieldRules) {
        throw new Error(`Ungültige Validierungsregeln für Feld ${field}`);
      }

      const validationRules = fieldRules as {
        minLength?: number;
        maxLength?: number;
        pattern?: string;
      };
      
      if (validationRules.minLength !== undefined && typeof validationRules.minLength !== 'number') {
        throw new Error(`Ungültige minLength für Feld ${field}`);
      }
      if (validationRules.maxLength !== undefined && typeof validationRules.maxLength !== 'number') {
        throw new Error(`Ungültige maxLength für Feld ${field}`);
      }
      if (validationRules.pattern !== undefined && typeof validationRules.pattern !== 'string') {
        throw new Error(`Ungültiges pattern für Feld ${field}`);
      }
    });

    // Prüfe customRules wenn vorhanden
    if (rules.customRules) {
      if (typeof rules.customRules !== 'object') {
        throw new Error("Ungültiges Format der customRules");
      }

      Object.entries(rules.customRules).forEach(([field, fieldRules]) => {
        if (!Array.isArray(fieldRules)) {
          throw new Error(`Ungültige customRules für Feld ${field}`);
        }

        fieldRules.forEach((rule, index) => {
          if (
            !rule.type ||
            !['string', 'number', 'boolean'].includes(rule.type) ||
            typeof rule.validation !== 'string' ||
            typeof rule.errorMessage !== 'string'
          ) {
            throw new Error(`Ungültige customRule ${index} für Feld ${field}`);
          }
        });
      });
    }
  }

  /**
   * Extrahiert relevante Suchfelder aus den Metadaten
   */
  private extractSearchFields(metadata: ContentMetadata): string[] {
    const fields = new Set<string>();
    
    // Basis-Felder
    fields.add('title');
    fields.add('description');
    
    // Füge spezifische Felder basierend auf Metadaten hinzu
    if (metadata.requirements) {
      fields.add('requirements');
    }

    // Füge zusätzliche Felder aus den Metadaten hinzu
    if (metadata.additionalFields) {
      Object.keys(metadata.additionalFields).forEach(field => fields.add(field));
    }

    return Array.from(fields);
  }

  /**
   * Generiert ein Standard-Response-Template
   */
  private async generateDefaultTemplate(metadata: ContentMetadata): Promise<string> {
    return `{
      "type": "${metadata.type}",
      "title": "{{title}}",
      "description": "{{description}}",
      "requirements": "{{requirements}}",
      "source": "{{source}}",
      "lastUpdated": "{{lastUpdated}}"
    }`;
  }

  /**
   * Prüft, ob ein Handler für den gegebenen Typ bereits existiert
   */
  public hasHandler(type: string): boolean {
    return this.handlerConfigs.has(type.toLowerCase());
  }

  /**
   * Gibt die Konfiguration eines existierenden Handlers zurück
   */
  public getHandlerConfig(type: string): HandlerConfig | undefined {
    return this.handlerConfigs.get(type.toLowerCase());
  }

  /**
   * Generiert Custom Rules aus den Validatoren
   */
  private generateCustomRules(validators: any): Record<string, Array<any>> {
    const rules: Record<string, Array<any>> = {};
    
    Object.entries(validators).forEach(([name, validator]) => {
      if (typeof validator === 'function' && !name.startsWith('calculate')) {
        rules[name.replace('validate', '').toLowerCase()] = [{
          type: 'string',
          validation: name,
          errorMessage: `Validierung fehlgeschlagen: ${name}`
        }];
      }
    });

    return rules;
  }

  /**
   * Passt einen bestehenden Handler an neue Anforderungen an
   */
  public async adaptHandler(
    handlerType: string,
    newMetadata: ContentMetadata,
    existingConfig?: HandlerConfig
  ): Promise<HandlerConfig> {
    try {
      // Generiere neue Konfiguration basierend auf den neuen Metadaten
      const newConfig = await this.generateHandlerConfig(newMetadata);
      
      if (!existingConfig) {
        return newConfig;
      }

      // Kombiniere die Suchfelder
      const searchFields = new Set([
        ...existingConfig.searchFields,
        ...newConfig.searchFields
      ]);

      // Erweitere die Validierungsregeln
      const validationRules = {
        required: [...new Set([
          ...existingConfig.validationRules.required,
          ...newConfig.validationRules.required
        ])],
        type: existingConfig.validationRules.type,
        template: existingConfig.validationRules.template,
        validation: {
          ...existingConfig.validationRules.validation,
          ...newConfig.validationRules.validation
        },
        customRules: {
          ...existingConfig.validationRules.customRules,
          ...newConfig.validationRules.customRules
        }
      };

      // Aktualisiere die Handler-Konfiguration
      const adaptedConfig: HandlerConfig = {
        type: handlerType,
        template: existingConfig.template,
        searchFields: Array.from(searchFields),
        responseTemplate: newConfig.responseTemplate, // Nutze das neue Template
        validationRules
      };

      // Validiere die angepasste Konfiguration
      this.validateHandlerConfig(adaptedConfig);

      // Aktualisiere die gespeicherte Konfiguration
      this.handlerConfigs.set(handlerType, adaptedConfig);

      // Zeichne die Anpassung im Monitoring auf
      this.monitoring.recordABTestMetrics(handlerType, 'adaptation', {
        adaptation_success: 1,
        fields_added: newConfig.searchFields.length,
        rules_added: Object.keys(newConfig.validationRules.validation).length
      });

      return adaptedConfig;
    } catch (error) {
      // Fehler-Monitoring
      this.monitoring.recordABTestMetrics(handlerType, 'adaptation', {
        adaptation_error: 1,
        error_timestamp: Date.now() / 1000
      });
      throw error;
    }
  }
} 