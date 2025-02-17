import { TemplateConfig } from '../../../types/template';
import { MonitoringService } from '../../../monitoring/monitoring';
import { createHash } from 'crypto';

interface CacheEntry {
  timestamp: number;
  template: TemplateConfig;
}

export class TemplateManager {
  private templates: Map<string, TemplateConfig>;
  private cache: Map<string, CacheEntry>;
  private monitoring: MonitoringService;
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1 Stunde

  constructor(monitoring: MonitoringService) {
    this.templates = new Map();
    this.cache = new Map();
    this.monitoring = monitoring;
  }

  async registerTemplate(template: TemplateConfig): Promise<void> {
    try {
      console.log(`[TemplateManager] Registriere Template ${template.id}`);
      
      // Validiere Template
      this.validateTemplate(template);
      
      // Speichere Template
      this.templates.set(template.id, template);
      
      // Lösche alten Cache für dieses Template
      const cacheKeys = Array.from(this.cache.keys());
      for (const key of cacheKeys) {
        if (key.includes(template.id)) {
          this.cache.delete(key);
        }
      }
      
      console.log(`[TemplateManager] Template ${template.id} erfolgreich registriert`);
      this.monitoring.recordEvent('template_registration', {
        templateId: template.id,
        version: template.version
      });
    } catch (error) {
      console.error(`[TemplateManager] Fehler bei der Template-Registrierung:`, error);
      this.monitoring.recordError('template_registration', error instanceof Error ? error.message : 'Unbekannter Fehler');
      throw error;
    }
  }

  getTemplate(id: string): TemplateConfig | undefined {
    return this.templates.get(id);
  }

  private validateTemplate(template: TemplateConfig): void {
    // Validiere Basis-Informationen
    if (!template.id || !template.name || !template.version) {
      throw new Error('Template muss id, name und version enthalten');
    }

    // Validiere Struktur
    if (!template.structure) {
      throw new Error('Template muss eine Struktur definieren');
    }

    // Validiere Patterns
    if (!template.structure.patterns || !Array.isArray(template.structure.patterns)) {
      throw new Error('Template muss patterns als Array definieren');
    }

    const requiredPatterns = template.structure.patterns.filter(p => p.required);
    if (requiredPatterns.length === 0) {
      throw new Error('Template muss mindestens ein required pattern definieren');
    }

    // Validiere Sections
    if (!template.structure.sections || !Array.isArray(template.structure.sections)) {
      throw new Error('Template muss sections als Array definieren');
    }

    // Validiere Metadata
    if (!template.structure.metadata || !Array.isArray(template.structure.metadata)) {
      throw new Error('Template muss metadata als Array definieren');
    }

    // Validiere Extractors
    if (!template.structure.extractors || !Array.isArray(template.structure.extractors)) {
      throw new Error('Template muss extractors als Array definieren');
    }

    // Validiere Handler-Konfiguration
    if (!template.handlerConfig) {
      throw new Error('Template muss eine handlerConfig definieren');
    }

    if (!template.handlerConfig.responseTypes || !Array.isArray(template.handlerConfig.responseTypes)) {
      throw new Error('HandlerConfig muss responseTypes als Array definieren');
    }

    // Validiere Extractor-Referenzen in Sections
    this.validateExtractorReferences(template);
  }

  private validateExtractorReferences(template: TemplateConfig): void {
    const extractorNames = new Set(template.structure.extractors.map(e => e.name));
    
    for (const section of template.structure.sections) {
      if (section.extractors) {
        for (const extractorName of section.extractors) {
          if (!extractorNames.has(extractorName)) {
            throw new Error(`Section "${section.name}" referenziert nicht existierenden Extraktor "${extractorName}"`);
          }
        }
      }
    }
  }

  async getCachedTemplate(id: string, content: string): Promise<TemplateConfig | undefined> {
    const cacheKey = this.generateCacheKey(id, content);
    const cachedEntry = this.cache.get(cacheKey);
    
    if (cachedEntry && this.isCacheValid(cachedEntry)) {
      console.log(`[TemplateManager] Cache-Treffer für Template ${id}`);
      return cachedEntry.template;
    }
    
    const template = this.getTemplate(id);
    if (template) {
      this.cache.set(cacheKey, {
        timestamp: Date.now(),
        template
      });
    }
    
    return template;
  }

  private generateCacheKey(templateId: string, content: string): string {
    return createHash('md5').update(`${templateId}:${content}`).digest('hex');
  }

  private isCacheValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.CACHE_TTL;
  }

  getAllTemplates(): TemplateConfig[] {
    return Array.from(this.templates.values());
  }

  deleteTemplate(id: string): boolean {
    const deleted = this.templates.delete(id);
    if (deleted) {
      // Lösche zugehörige Cache-Einträge
      const cacheKeys = Array.from(this.cache.keys());
      for (const key of cacheKeys) {
        if (key.includes(id)) {
          this.cache.delete(key);
        }
      }
    }
    return deleted;
  }
} 