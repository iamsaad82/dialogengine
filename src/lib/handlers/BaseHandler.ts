import { HandlerConfig } from '../types/HandlerConfig';
import { ContentMetadata } from '../types/ContentMetadata';
import { eventCollector } from '../monitoring/client-events';

export class BaseHandler {
  protected readonly config: HandlerConfig;

  constructor(config: HandlerConfig) {
    this.config = config;
  }

  /**
   * Gibt den Typ des Handlers zurück
   */
  public getType(): string {
    return this.config.type;
  }

  /**
   * Verarbeitet eine Suchanfrage
   */
  public async handleSearch(query: string): Promise<any> {
    const startTime = Date.now()
    
    try {
      // Validiere die Anfrage
      this.validateQuery(query);

      // Führe die Suche durch
      const results = await this.search(query);

      // Formatiere die Ergebnisse
      const response = this.formatResponse(results);

      // Zeichne erfolgreichen Aufruf auf
      const duration = (Date.now() - startTime) / 1000
      eventCollector.recordCall(this.constructor.name, true)
      eventCollector.recordLatency(this.constructor.name, duration)

      return response;
    } catch (error) {
      // Zeichne fehlgeschlagenen Aufruf auf
      eventCollector.recordCall(this.constructor.name, false)
      throw error;
    }
  }

  /**
   * Validiert eine Suchanfrage
   */
  protected validateQuery(query: string): void {
    if (!query || query.trim().length < 3) {
      throw new Error('Query must be at least 3 characters long');
    }
  }

  /**
   * Führt die eigentliche Suche durch
   */
  protected async search(query: string): Promise<any[]> {
    // Implementierung in abgeleiteten Klassen
    return [];
  }

  /**
   * Formatiert die Suchergebnisse gemäß Template
   */
  protected formatResponse(results: any[]): any {
    return results.map(result => {
      let response = this.config.responseTemplate;
      
      // Ersetze Template-Variablen
      Object.entries(result).forEach(([key, value]) => {
        response = response.replace(
          new RegExp(`{{${key}}}`, 'g'),
          String(value)
        );
      });

      try {
        return JSON.parse(response);
      } catch (error) {
        console.error('Error parsing response template:', error);
        return result;
      }
    });
  }

  /**
   * Validiert Content-Metadaten gegen die Handler-Regeln
   */
  public validateMetadata(metadata: ContentMetadata): boolean {
    const rules = this.config.validationRules;

    // Prüfe required fields
    for (const field of rules.required) {
      if (!metadata[field as keyof ContentMetadata]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Prüfe Typ und Template
    if (metadata.type !== rules.type) {
      throw new Error(`Invalid content type: ${metadata.type}`);
    }

    if (rules.template && metadata.template !== rules.template) {
      throw new Error(`Invalid template: ${metadata.template}`);
    }

    // Prüfe Feldvalidierungen
    Object.entries(rules.validation).forEach(([field, validations]) => {
      const value = metadata[field as keyof ContentMetadata];
      if (value) {
        if (typeof value === 'string') {
          if (validations.minLength && value.length < validations.minLength) {
            throw new Error(`${field} is too short`);
          }
          if (validations.maxLength && value.length > validations.maxLength) {
            throw new Error(`${field} is too long`);
          }
          if (validations.pattern && !new RegExp(validations.pattern).test(value)) {
            throw new Error(`${field} does not match required pattern`);
          }
        }
        if (validations.custom && !validations.custom(value)) {
          throw new Error(`${field} failed custom validation`);
        }
      }
    });

    return true;
  }
} 