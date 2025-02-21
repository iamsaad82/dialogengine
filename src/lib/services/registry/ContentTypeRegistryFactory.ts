import { ContentTypeDefinition } from '@/lib/types/contentTypes'
import { ContentTypeRegistryImpl } from './ContentTypeRegistryImpl'
import { BaseContentTypes } from '@/lib/types/contentTypes'

export class ContentTypeRegistryFactory {
  static createRegistry(templateId: string): ContentTypeRegistryImpl {
    const registry = new ContentTypeRegistryImpl(templateId)

    // Registriere Standard-Content-Types
    const standardTypes: ContentTypeDefinition[] = [
      // Basis-Dokumente
      {
        id: 'document',
        name: 'Dokument',
        description: 'Allgemeines Dokument mit strukturiertem Inhalt',
        type: BaseContentTypes.DOCUMENT,
        metadata: {
          category: 'document',
          version: '1.0'
        },
        validation: {
          required: ['title', 'content'],
          patterns: [
            {
              name: 'title',
              pattern: '^.{3,100}$',
              required: true,
              examples: ['Produktbeschreibung', 'Serviceanleitung'],
              extractMetadata: ['title']
            },
            {
              name: 'content',
              pattern: '^[\\s\\S]{10,}$',
              required: true,
              examples: ['Detaillierte Beschreibung...', 'Hauptinhalt des Dokuments...']
            }
          ],
          rules: ['title_required', 'content_required']
        }
      },

      // FAQ & Support
      {
        id: 'faq',
        name: 'FAQ',
        description: 'Häufig gestellte Fragen und Antworten',
        type: BaseContentTypes.FAQ,
        metadata: {
          category: 'support',
          version: '1.0'
        },
        validation: {
          required: ['question', 'answer'],
          patterns: [
            {
              name: 'question',
              pattern: '^[^.!?]+[.!?]$',
              required: true,
              examples: ['Wie funktioniert das?', 'Was kostet der Service?'],
              extractMetadata: ['question']
            },
            {
              name: 'answer',
              pattern: '^[\\s\\S]{10,}$',
              required: true,
              examples: ['Die Funktionsweise...', 'Der Service kostet...']
            }
          ],
          rules: ['question_required', 'answer_required']
        }
      },

      // Service & Produkte
      {
        id: 'service',
        name: 'Service',
        description: 'Dienstleistungen und Services',
        type: BaseContentTypes.SERVICE,
        metadata: {
          category: 'service',
          version: '1.0'
        },
        validation: {
          required: ['title', 'description', 'price'],
          patterns: [
            {
              name: 'title',
              pattern: '^.{3,100}$',
              required: true,
              examples: ['Beratung', 'Installation'],
              extractMetadata: ['title']
            },
            {
              name: 'price',
              pattern: '^\\d+(\\.\\d{2})?\\s*€?$',
              required: true,
              examples: ['99.99 €', '50.00'],
              extractMetadata: ['price']
            }
          ],
          rules: ['title_required', 'price_required']
        }
      },

      // Events & Termine
      {
        id: 'event',
        name: 'Event',
        description: 'Veranstaltungen und Termine',
        type: BaseContentTypes.EVENT,
        metadata: {
          category: 'event',
          version: '1.0'
        },
        validation: {
          required: ['title', 'date', 'location'],
          patterns: [
            {
              name: 'date',
              pattern: '^\\d{4}-\\d{2}-\\d{2}(\\s\\d{2}:\\d{2})?$',
              required: true,
              examples: ['2024-03-15', '2024-03-15 14:30'],
              extractMetadata: ['date']
            },
            {
              name: 'location',
              pattern: '^.{5,200}$',
              required: true,
              examples: ['Konferenzraum A, Hauptstraße 1, 12345 Stadt'],
              extractMetadata: ['location']
            }
          ],
          rules: ['date_required', 'location_required']
        }
      },

      // Tutorials & Anleitungen
      {
        id: 'tutorial',
        name: 'Tutorial',
        description: 'Schritt-für-Schritt Anleitungen',
        type: BaseContentTypes.TUTORIAL,
        metadata: {
          category: 'tutorial',
          version: '1.0'
        },
        validation: {
          required: ['title', 'steps'],
          patterns: [
            {
              name: 'steps',
              pattern: '^(\\d+\\.\\s.+\\n?)+$',
              required: true,
              examples: ['1. Schritt eins\n2. Schritt zwei'],
              extractMetadata: ['steps']
            }
          ],
          rules: ['steps_required']
        }
      },

      // Kontakt & Support
      {
        id: 'contact',
        name: 'Kontakt',
        description: 'Kontaktinformationen und Support',
        type: BaseContentTypes.CONTACT,
        metadata: {
          category: 'contact',
          version: '1.0'
        },
        validation: {
          required: ['type', 'value'],
          patterns: [
            {
              name: 'type',
              pattern: '^(email|phone|address)$',
              required: true,
              examples: ['email', 'phone'],
              extractMetadata: ['contactType']
            },
            {
              name: 'value',
              pattern: '^.+$',
              required: true,
              examples: ['support@example.com', '+49 123 456789'],
              extractMetadata: ['contactValue']
            }
          ],
          rules: ['contact_type_required', 'contact_value_required']
        }
      },

      // Downloads & Ressourcen
      {
        id: 'download',
        name: 'Download',
        description: 'Downloadbare Dateien und Ressourcen',
        type: BaseContentTypes.DOWNLOAD,
        metadata: {
          category: 'download',
          version: '1.0'
        },
        validation: {
          required: ['title', 'url', 'fileType'],
          patterns: [
            {
              name: 'url',
              pattern: '^https?://.+',
              required: true,
              examples: ['https://example.com/download/file.pdf'],
              extractMetadata: ['url']
            },
            {
              name: 'fileType',
              pattern: '^\\.(pdf|doc|docx|xls|xlsx|zip)$',
              required: true,
              examples: ['.pdf'],
              extractMetadata: ['fileType']
            },
            {
              name: 'fileSize',
              pattern: '^\\d+(\\.\\d+)?\\s*(KB|MB|GB)$',
              required: false,
              examples: ['2.5 MB'],
              extractMetadata: ['fileSize']
            }
          ],
          rules: ['url_required', 'filetype_required']
        }
      }
    ]

    standardTypes.forEach(type => registry.register(type))
    return registry
  }
} 