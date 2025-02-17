import { HandlerGenerator } from '../../../src/lib/handlers/HandlerGenerator';
import { ContentMetadata } from '../../../src/lib/types/ContentMetadata';
import { MonitoringService } from '../../../src/lib/monitoring/monitoring';
import { medicalValidators } from '../../../src/lib/validation/medical';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai', () => {
  const mockOpenAI = {
    chat: {
      completions: {
        create: jest.fn().mockImplementation(({ messages }: { messages: Array<{ role: string; content: string }> }) => {
          // Extrahiere den Typ und Template aus den Nachrichten
          const content = messages.map(m => m.content).join('\n');
          const type = content.match(/type: ['"]([^'"]+)['"]/)?.[1] || 'test';
          const template = content.match(/template: ['"]([^'"]+)['"]/)?.[1];
          
          // Prüfe auf fehlende Pflichtfelder
          const hasTitle = content.includes('title:') && !content.includes('title: ""');
          const hasDescription = content.includes('description:') && !content.includes('description: ""');
          
          // Prüfe, ob es sich um einen Fehlerfall handelt
          const isErrorCase = content.includes('generateHandlerConfig') && (!hasTitle || !hasDescription);
          
          if (isErrorCase) {
            throw new Error('Fehlende Pflichtfelder');
          }
          
          return Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify({
                  searchFields: ['title', 'description', 'requirements'],
                  responseTemplate: '{"type":"{{type}}","title":"{{title}}"}',
                  validationRules: {
                    required: ['title', 'description'],
                    type: type,
                    template: template,
                    validation: {
                      query: {
                        minLength: 3,
                        maxLength: 1000
                      }
                    },
                    customRules: {
                      email: [{
                        type: 'string',
                        validation: 'isEmail',
                        errorMessage: 'Ungültige E-Mail-Adresse'
                      }]
                    }
                  }
                })
              }
            }]
          });
        })
      }
    }
  };

  return {
    OpenAI: jest.fn(() => mockOpenAI)
  };
});

describe('HandlerGenerator', () => {
  let generator: HandlerGenerator;
  let monitoring: MonitoringService;

  beforeEach(() => {
    monitoring = new MonitoringService({
      serviceName: 'test-service',
      serviceVersion: '1.0.0'
    });
    generator = new HandlerGenerator('test-api-key', monitoring);
  });

  describe('Handler-Generierung', () => {
    it('sollte einen Handler mit medizinischen Validatoren generieren', async () => {
      const metadata: ContentMetadata = {
        type: 'medical',
        template: 'standard',
        title: 'Behandlungsrichtlinien',
        description: 'Standardisierte Behandlungsrichtlinien für häufige Erkrankungen',
        additionalFields: {
          medications: 'Ibuprofen,Paracetamol',
          contraindications: 'Nicht anwenden bei bekannter Überempfindlichkeit.'
        }
      };

      const handler = await generator.generateHandler(metadata);
      const config = generator.getHandlerConfig('medical_standard');
      
      expect(config).toBeDefined();
      expect(config?.validationRules.customRules).toBeDefined();
      expect(config?.validationRules.customRules?.medications).toBeDefined();
      expect(config?.validationRules.customRules?.contraindications).toBeDefined();
    });

    it('sollte die medizinischen Validatoren korrekt integrieren', async () => {
      const metadata: ContentMetadata = {
        type: 'medical',
        template: 'standard',
        title: 'Test',
        description: 'Test Description',
        additionalFields: {
          medications: 'Ibuprofen,Paracetamol'
        }
      };

      const handler = await generator.generateHandler(metadata);
      const config = generator.getHandlerConfig('medical_standard');

      // Prüfe, ob die Validatoren korrekt integriert wurden
      expect(config?.validationRules.customRules?.medications[0].validation)
        .toBe('validateMedications');
    });
  });

  describe('Validierungsmechanismen', () => {
    it('sollte domänenspezifische Validatoren korrekt anwenden', async () => {
      const metadata: ContentMetadata = {
        type: 'medical',
        template: 'standard',
        title: 'Test',
        description: 'Test Description',
        additionalFields: {
          medications: 'Invalid@Medicine',  // Ungültiges Format
          contraindications: 'Kurz'  // Zu kurz
        }
      };

      const handler = await generator.generateHandler(metadata);
      
      // Validiere die Metadaten mit den generierten Regeln
      expect(() => handler.validateMetadata(metadata)).toThrow();
    });

    it('sollte nicht-medizinische Handler ohne spezielle Validatoren generieren', async () => {
      const metadata: ContentMetadata = {
        type: 'general',
        template: 'standard',
        title: 'Test',
        description: 'Test Description'
      };

      const handler = await generator.generateHandler(metadata);
      const config = generator.getHandlerConfig('general_standard');

      expect(config?.validationRules.customRules?.medications).toBeUndefined();
      expect(config?.validationRules.customRules?.contraindications).toBeUndefined();
    });
  });

  describe('Fehlerbehandlung', () => {
    it('sollte fehlende Pflichtfelder erkennen', async () => {
      const invalidMetadata = {
        type: 'medical'
      } as ContentMetadata;

      await expect(async () => {
        await generator.generateHandler(invalidMetadata);
      }).rejects.toThrow('Fehlende Pflichtfelder');
    });

    it('sollte Fehler bei der Validierung aufzeichnen', async () => {
      const recordHandlerCallSpy = jest.spyOn(monitoring, 'recordHandlerCall');
      const recordABTestMetricsSpy = jest.spyOn(monitoring, 'recordABTestMetrics');

      const invalidMetadata = {
        type: 'medical'
      } as ContentMetadata;

      try {
        await generator.generateHandler(invalidMetadata);
      } catch (error) {
        expect(recordHandlerCallSpy).toHaveBeenCalledWith('medical', false);
        expect(recordABTestMetricsSpy).toHaveBeenCalled();
      }
    });
  });

  describe('Monitoring-Integration', () => {
    it('sollte erfolgreiche Handler-Generierung aufzeichnen', async () => {
      const metadata: ContentMetadata = {
        type: 'medical',
        template: 'standard',
        title: 'Test',
        description: 'Test Description'
      };

      const recordHandlerCallSpy = jest.spyOn(monitoring, 'recordHandlerCall');
      const recordHandlerLatencySpy = jest.spyOn(monitoring, 'recordHandlerLatency');

      await generator.generateHandler(metadata);

      expect(recordHandlerCallSpy).toHaveBeenCalledWith('medical_standard', true);
      expect(recordHandlerLatencySpy).toHaveBeenCalled();
    });
  });

  describe('Handler-Anpassung', () => {
    it('sollte einen bestehenden Handler an neue Anforderungen anpassen', async () => {
      // Erstelle initialen Handler
      const initialMetadata: ContentMetadata = {
        type: 'medical',
        template: 'standard',
        title: 'Test',
        description: 'Test Description',
        additionalFields: {
          medications: 'Ibuprofen,Paracetamol'
        }
      };

      await generator.generateHandler(initialMetadata);
      const initialConfig = generator.getHandlerConfig('medical_standard');
      expect(initialConfig).toBeDefined();

      // Neue Metadaten mit zusätzlichen Feldern
      const newMetadata: ContentMetadata = {
        type: 'medical',
        template: 'standard',
        title: 'Test Updated',
        description: 'Updated Description',
        additionalFields: {
          medications: 'Aspirin,Ibuprofen',
          contraindications: 'Nicht anwenden bei bekannter Überempfindlichkeit',
          dosage: '1-2 Tabletten'
        }
      };

      // Adaptiere den Handler
      const adaptedConfig = await generator.adaptHandler('medical_standard', newMetadata, initialConfig);

      // Überprüfe die Anpassungen
      expect(adaptedConfig.searchFields).toContain('dosage');
      expect(adaptedConfig.validationRules.required).toContain('title');
      expect(adaptedConfig.validationRules.customRules).toBeDefined();
      expect(adaptedConfig.validationRules.customRules?.medications).toBeDefined();
      expect(adaptedConfig.validationRules.customRules?.contraindications).toBeDefined();
    });

    it('sollte neue Validierungsregeln korrekt integrieren', async () => {
      const initialMetadata: ContentMetadata = {
        type: 'medical',
        template: 'standard',
        title: 'Test',
        description: 'Test Description'
      };

      await generator.generateHandler(initialMetadata);
      const initialConfig = generator.getHandlerConfig('medical_standard');

      const newMetadata: ContentMetadata = {
        type: 'medical',
        template: 'standard',
        title: 'Test',
        description: 'Test Description',
        additionalFields: {
          dosage: '1-2 Tabletten täglich'
        }
      };

      const adaptedConfig = await generator.adaptHandler('medical_standard', newMetadata, initialConfig);

      // Überprüfe, ob die neuen Validierungsregeln integriert wurden
      expect(adaptedConfig.validationRules.validation).toHaveProperty('dosage');
    });

    it('sollte das Monitoring bei der Anpassung aktualisieren', async () => {
      const recordABTestMetricsSpy = jest.spyOn(monitoring, 'recordABTestMetrics');

      const initialMetadata: ContentMetadata = {
        type: 'medical',
        template: 'standard',
        title: 'Test',
        description: 'Test Description'
      };

      await generator.generateHandler(initialMetadata);
      const initialConfig = generator.getHandlerConfig('medical_standard');

      const newMetadata: ContentMetadata = {
        type: 'medical',
        template: 'standard',
        title: 'Test Updated',
        description: 'Updated Description',
        additionalFields: {
          newField: 'test'
        }
      };

      await generator.adaptHandler('medical_standard', newMetadata, initialConfig);

      expect(recordABTestMetricsSpy).toHaveBeenCalledWith(
        'medical_standard',
        'adaptation',
        expect.objectContaining({
          adaptation_success: 1
        })
      );
    });
  });
}); 