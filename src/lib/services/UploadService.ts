import { BaseContentType, BaseContentTypes } from '@/lib/types/contentTypes';
import { HandlerConfig } from '@/lib/types/handler';
import { DocumentPattern, MetadataDefinition } from '@/lib/types/common';
import { nanoid } from 'nanoid';

interface HandlerConfigData {
  metadata: {
    [key: string]: {
      type: string;
      required: boolean;
      name?: string;
    };
  };
  patterns: Array<{
    name: string;
    pattern: string;
    required: boolean;
    extractors: string[];
  }>;
  settings: Record<string, unknown>;
  responseTypes: string[];
}

const determineContentType = (domain: string): BaseContentType => {
  const domainMap: Record<string, BaseContentType> = {
    'Gesundheit': BaseContentTypes.SERVICE,
    'Bildung': BaseContentTypes.SERVICE,
    'Finanzen': BaseContentTypes.SERVICE,
    'Produkte': BaseContentTypes.PRODUCT,
    'Events': BaseContentTypes.EVENT,
    'default': BaseContentTypes.SERVICE
  };
  
  return domainMap[domain] || domainMap.default;
};

const defaultMetadataFields: Record<string, MetadataDefinition> = {
  title: {
    name: 'Titel',
    type: 'string',
    required: true
  },
  description: {
    name: 'Beschreibung',
    type: 'string',
    required: true
  },
  contact: {
    name: 'Kontakt',
    type: 'string',
    required: false
  },
  availability: {
    name: 'Verfügbarkeit',
    type: 'string',
    required: false
  }
};

const defaultPatterns: DocumentPattern[] = [
  {
    name: 'Leistungen',
    pattern: '\\b(Leistung|Behandlung|Therapie|Vorsorge)\\b',
    required: true,
    examples: ['Unsere Leistungen umfassen', 'Wir bieten folgende Behandlungen'],
    extractMetadata: ['title', 'description']
  },
  {
    name: 'Kontakt',
    pattern: '\\b(Kontakt|Ansprechpartner|Telefon|E-Mail)\\b',
    required: false,
    examples: ['Kontaktieren Sie uns', 'Unsere Telefonnummer'],
    extractMetadata: ['contact', 'availability']
  }
];

const createHandlerConfig = (templateId: string, domain: string): HandlerConfig => ({
  id: nanoid(),
  name: `Generated Handler ${nanoid(6)}`,
  type: determineContentType(domain),
  active: true,
  capabilities: ['text', 'list'],
  config: {
    patterns: defaultPatterns,
    metadata: defaultMetadataFields,
    settings: {
      matchThreshold: 0.8,
      contextWindow: 3,
      maxTokens: 1000,
      dynamicResponses: true,
      includeLinks: true,
      includeContact: true,
      includeSteps: false,
      includePrice: false,
      includeAvailability: true,
      useExactMatches: false
    }
  },
  metadata: {
    version: '1.0',
    generated: true,
    timestamp: new Date().toISOString(),
    templateId: templateId
  }
}); 