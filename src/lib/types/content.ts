import { z } from 'zod';

// Zentrale Definition der Content Types
export const ContentTypes = {
  UNKNOWN: 'unknown',
  INFO: 'info',
  SERVICE: 'service',
  PRODUCT: 'product',
  EVENT: 'event',
  LOCATION: 'location',
  CONTACT: 'contact',
  VIDEO: 'video',
  IMAGE: 'image',
  DOCUMENT: 'document',
  DOWNLOAD: 'download',
  LINK: 'link',
  FAQ: 'faq',
  INSURANCE: 'insurance',
  NAVIGATION: 'navigation',
  PROCESS: 'process',
  WAIT: 'wait',
  MEDICAL: 'medical',
  CITY_ADMINISTRATION: 'city-administration',
  GENERAL: 'general',
  SHOPPING_CENTER: 'shopping-center'
} as const;

export type ContentType = typeof ContentTypes[keyof typeof ContentTypes];

// Validierungsschema für Content Types
export const ContentTypeSchema = z.enum([
  'unknown',
  'info',
  'service',
  'product',
  'event',
  'location',
  'contact',
  'video',
  'image',
  'document',
  'download',
  'link',
  'faq',
  'insurance',
  'navigation',
  'process',
  'wait',
  'medical',
  'city-administration',
  'general',
  'shopping-center'
]);

// Hilfsfunktionen für Content Type Checks
export const isInteractiveContent = (type: ContentType): boolean => {
  const interactiveTypes = ['service', 'product', 'faq', 'insurance'] as const;
  return interactiveTypes.includes(type as typeof interactiveTypes[number]);
};

export const isMediaContent = (type: ContentType): boolean => {
  const mediaTypes = ['video', 'image', 'document', 'download'] as const;
  return mediaTypes.includes(type as typeof mediaTypes[number]);
};

export const isNavigationalContent = (type: ContentType): boolean => {
  const navTypes = ['link', 'navigation', 'process'] as const;
  return navTypes.includes(type as typeof navTypes[number]);
}; 