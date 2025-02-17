import { MedicalHandler } from '../../../src/lib/handlers/MedicalHandler';
import { ContentMetadata } from '../../../src/lib/types/ContentMetadata';

interface SearchResult {
  title: string;
  description: string;
  diagnosis?: string;
  treatment?: string;
  symptoms?: string;
  relevance: number;
}

describe('MedicalHandler', () => {
  let handler: MedicalHandler;

  beforeEach(() => {
    handler = new MedicalHandler();
  });

  describe('Basis-Funktionalität', () => {
    it('sollte korrekt initialisiert werden', () => {
      expect(handler).toBeDefined();
      expect(handler.getType()).toBe('medical');
    });

    it('sollte die richtigen Suchfelder haben', () => {
      const config = handler['config'];
      expect(config.searchFields).toContain('title');
      expect(config.searchFields).toContain('description');
      expect(config.searchFields).toContain('symptoms');
      expect(config.searchFields).toContain('diagnosis');
      expect(config.searchFields).toContain('medications');
    });

    it('sollte ein gültiges Response-Template haben', () => {
      const config = handler['config'];
      expect(config.responseTemplate).toContain('"type": "medical"');
      expect(config.responseTemplate).toContain('"diagnosis": "{{diagnosis}}"');
      expect(config.responseTemplate).toContain('"medications": "{{medications}}"');
    });
  });

  describe('Validierung', () => {
    it('sollte gültige medizinische Metadaten akzeptieren', () => {
      const metadata: ContentMetadata = {
        type: 'medical',
        template: 'standard',
        title: 'Behandlung von Kopfschmerzen',
        description: 'Standardisierte Behandlungsrichtlinien für verschiedene Arten von Kopfschmerzen',
        additionalFields: {
          diagnosis: 'Migräne und Spannungskopfschmerz',
          medications: 'Ibuprofen,Paracetamol,Sumatriptan',
          contraindications: 'Nicht anwenden bei bekannter Überempfindlichkeit gegen NSAIDs.'
        }
      };

      expect(() => handler.validateMetadata(metadata)).not.toThrow();
    });

    it('sollte ungültige Medikamentenformate erkennen', () => {
      const metadata: ContentMetadata = {
        type: 'medical',
        template: 'standard',
        title: 'Behandlung von Allergien',
        description: 'Standardisierte Behandlungsrichtlinien für verschiedene Arten von allergischen Reaktionen',
        additionalFields: {
          medications: 'Ibuprofen, Invalid@Medicine, Test123!'  // Ungültiges Format
        }
      };

      expect(() => handler.validateMetadata(metadata)).toThrow('Ungültiges Medikamentenformat');
    });

    it('sollte ungültige Kontraindikationen erkennen', () => {
      const metadata: ContentMetadata = {
        type: 'medical',
        template: 'standard',
        title: 'Behandlung von Allergien',
        description: 'Standardisierte Behandlungsrichtlinien für verschiedene Arten von allergischen Reaktionen',
        additionalFields: {
          contraindications: 'Kurz'  // Zu kurz
        }
      };

      expect(() => handler.validateMetadata(metadata)).toThrow('Ungültiges Format für Kontraindikationen');
    });

    it('sollte Pflichtfelder validieren', () => {
      const metadata: ContentMetadata = {
        type: 'medical',
        template: 'standard',
        title: 'Test',
        description: ''  // Leere Beschreibung
      };

      expect(() => handler.validateMetadata(metadata)).toThrow();
    });
  });

  describe('Suche und Relevanz', () => {
    it('sollte Suchergebnisse mit Relevanz zurückgeben', async () => {
      const query = 'Kopfschmerzen Migräne';
      const results = await handler.handleSearch(query);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      results.forEach((result: SearchResult) => {
        expect(result).toHaveProperty('relevance');
        expect(typeof result.relevance).toBe('number');
      });
    });

    it('sollte die Relevanz basierend auf medizinischen Kriterien berechnen', async () => {
      const query = 'Migräne Behandlung';
      const results = await handler.handleSearch(query);

      // Ergebnisse mit übereinstimmender Diagnose sollten höhere Relevanz haben
      const resultWithDiagnosis = results.find((r: SearchResult) => 
        r.diagnosis && r.diagnosis.toLowerCase().includes('migräne')
      );
      const resultWithoutDiagnosis = results.find((r: SearchResult) => 
        !r.diagnosis || !r.diagnosis.toLowerCase().includes('migräne')
      );

      if (resultWithDiagnosis && resultWithoutDiagnosis) {
        expect(resultWithDiagnosis.relevance).toBeGreaterThan(resultWithoutDiagnosis.relevance);
      }
    });

    it('sollte die minimale Suchanfragenlänge validieren', async () => {
      await expect(handler.handleSearch('kurz')).rejects.toThrow();
    });
  });

  describe('Fehlerbehandlung', () => {
    it('sollte bei ungültiger Suchanfrage einen Fehler werfen', async () => {
      await expect(handler.handleSearch('')).rejects.toThrow();
    });

    it('sollte bei ungültigen Metadaten einen spezifischen Fehler werfen', () => {
      const invalidMetadata: ContentMetadata = {
        type: 'medical',
        template: 'standard',
        title: 'a',  // Zu kurz
        description: 'Zu kurze Beschreibung'
      };

      expect(() => handler.validateMetadata(invalidMetadata)).toThrow();
    });
  });
}); 