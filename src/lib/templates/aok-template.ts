import { TemplateConfig } from '../types/template';

export const aokTemplate: TemplateConfig = {
  id: 'aok-template',
  name: 'AOK Dokumenten Template',
  version: '1.0.0',
  structure: {
    patterns: [
      {
        name: 'aok-leistung',
        pattern: '(Leistungen|Versicherungsschutz|Gesundheitsleistungen)',
        required: true,
        extractMetadata: ['leistungstyp']
      },
      {
        name: 'aok-kontakt',
        pattern: '(Kontakt|Beratung|Service)',
        required: false,
        extractMetadata: ['kontaktart']
      }
    ],
    sections: [
      {
        name: 'leistungsbeschreibung',
        startPattern: '^(Leistungen|Was wird versichert\\?)',
        endPattern: '^(Weitere Informationen|Kontakt|$)',
        required: true,
        extractors: ['leistungsdetails', 'kostenextractor']
      },
      {
        name: 'voraussetzungen',
        startPattern: '^(Voraussetzungen|Wer kann teilnehmen\\?)',
        endPattern: '^(Leistungen|Weitere Informationen|$)',
        required: false,
        extractors: ['bedingungsextractor']
      },
      {
        name: 'kontaktinformationen',
        startPattern: '^(Kontakt|Ihre AOK vor Ort)',
        endPattern: '^(Ende|$)',
        required: false,
        extractors: ['kontaktextractor']
      }
    ],
    metadata: [
      {
        name: 'leistungstyp',
        type: 'string',
        required: true,
        pattern: 'Typ:\\s*([^\\n]+)'
      },
      {
        name: 'zielgruppe',
        type: 'string[]',
        required: false,
        pattern: 'Für:\\s*([^\\n]+)'
      },
      {
        name: 'aktualisiert',
        type: 'date',
        required: false,
        pattern: 'Aktualisiert:\\s*(\\d{2}\\.\\d{2}\\.\\d{4})'
      }
    ],
    extractors: [
      {
        name: 'leistungsdetails',
        type: 'ai',
        config: {
          prompt: `Analysiere den Text und extrahiere die wichtigsten Leistungsdetails.
                  Berücksichtige dabei:
                  - Art der Leistung
                  - Umfang der Leistung
                  - Besondere Merkmale
                  - Einschränkungen
                  Formatiere das Ergebnis als JSON mit diesen Kategorien.`,
          model: 'gpt-3.5-turbo',
          temperature: 0.3
        }
      },
      {
        name: 'kostenextractor',
        type: 'regex',
        config: {
          kosten: 'Kosten:\\s*([^\\n]+)',
          erstattung: 'Erstattung:\\s*([^\\n]+)',
          zuzahlung: 'Zuzahlung:\\s*([^\\n]+)'
        }
      },
      {
        name: 'bedingungsextractor',
        type: 'ai',
        config: {
          prompt: `Extrahiere die Teilnahmebedingungen und Voraussetzungen.
                  Strukturiere sie in:
                  - Grundvoraussetzungen
                  - Altersbeschränkungen
                  - Besondere Bedingungen
                  Gib das Ergebnis als JSON zurück.`,
          model: 'gpt-3.5-turbo',
          temperature: 0.3
        }
      },
      {
        name: 'kontaktextractor',
        type: 'regex',
        config: {
          telefon: 'Tel(?:efon)?:\\s*([\\d\\s-+()]+)',
          email: 'E-Mail:\\s*([\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,})',
          sprechzeiten: 'Sprechzeiten:\\s*([^\\n]+)',
          adresse: 'Adresse:\\s*([^\\n]+(?:\\n[^\\n]+)*)'
        }
      }
    ]
  },
  handlerConfig: {
    responseTypes: ['standard', 'detailed', 'contact'],
    requiredMetadata: ['leistungstyp'],
    customSettings: {
      includeContact: true,
      includePrice: true,
      matchThreshold: 0.8,
      contextWindow: 3
    }
  }
}; 