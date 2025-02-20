// Basis Content Types
export enum BaseContentType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success'
}

// Business Domain Types
export enum DomainContentType {
  MEDICAL = 'medical',
  INSURANCE = 'insurance',
  CITY_ADMINISTRATION = 'city-administration',
  SHOPPING_CENTER = 'shopping-center',
  DEFAULT = 'default'
}

// AOK-specific Content Types
export enum AOKContentType {
  MEDICAL = 'aok-medical',
  PREVENTION = 'aok-prevention',
  INSURANCE = 'aok-insurance',
  SERVICE = 'aok-service',
  BONUS = 'aok-bonus',
  CURAPLAN = 'aok-curaplan',
  FAMILY = 'aok-family',
  DIGITAL = 'aok-digital',
  EMERGENCY = 'aok-emergency',
  CONTACT = 'aok-contact'
}

// Union type for all content types
export type ContentType = BaseContentType | DomainContentType | AOKContentType

// Helper object for easy access
export const ContentTypes = {
  // Base types
  Info: BaseContentType.INFO,
  Warning: BaseContentType.WARNING,
  Error: BaseContentType.ERROR,
  Success: BaseContentType.SUCCESS,

  // Domain types
  Medical: DomainContentType.MEDICAL,
  Insurance: DomainContentType.INSURANCE,
  CityAdministration: DomainContentType.CITY_ADMINISTRATION,
  ShoppingCenter: DomainContentType.SHOPPING_CENTER,
  Default: DomainContentType.DEFAULT,

  // AOK types
  AOKMedical: AOKContentType.MEDICAL,
  AOKPrevention: AOKContentType.PREVENTION,
  AOKInsurance: AOKContentType.INSURANCE,
  AOKService: AOKContentType.SERVICE,
  AOKBonus: AOKContentType.BONUS,
  AOKCuraPlan: AOKContentType.CURAPLAN,
  AOKFamily: AOKContentType.FAMILY,
  AOKDigital: AOKContentType.DIGITAL,
  AOKEmergency: AOKContentType.EMERGENCY,
  AOKContact: AOKContentType.CONTACT
} as const

// All available content categories
export const CONTENT_CATEGORIES = [
  ...Object.values(BaseContentType),
  ...Object.values(DomainContentType),
  ...Object.values(AOKContentType)
] as const

export type ContentCategory = typeof CONTENT_CATEGORIES[number]

// Type guards
export function isBaseContentType(type: string): type is BaseContentType {
  return Object.values(BaseContentType).includes(type as BaseContentType)
}

export function isDomainContentType(type: string): type is DomainContentType {
  return Object.values(DomainContentType).includes(type as DomainContentType)
}

export function isAOKContentType(type: string): type is AOKContentType {
  return Object.values(AOKContentType).includes(type as AOKContentType)
}

export function isValidContentType(type: string): type is ContentType {
  return isBaseContentType(type) || isDomainContentType(type) || isAOKContentType(type)
}

// Labels for UI display
export const ContentCategoryLabels: Record<ContentCategory, string> = {
  // Base types
  [BaseContentType.INFO]: 'Information',
  [BaseContentType.WARNING]: 'Warnung',
  [BaseContentType.ERROR]: 'Fehler',
  [BaseContentType.SUCCESS]: 'Erfolg',

  // Domain types
  [DomainContentType.CITY_ADMINISTRATION]: 'Stadtverwaltung',
  [DomainContentType.MEDICAL]: 'Medizin',
  [DomainContentType.INSURANCE]: 'Versicherung',
  [DomainContentType.SHOPPING_CENTER]: 'Einkaufszentrum',
  [DomainContentType.DEFAULT]: 'Standard',

  // AOK types
  [AOKContentType.MEDICAL]: 'Medizinische Informationen',
  [AOKContentType.INSURANCE]: 'Versicherungsleistungen',
  [AOKContentType.PREVENTION]: 'Vorsorge & Prävention',
  [AOKContentType.SERVICE]: 'Service & Beratung',
  [AOKContentType.BONUS]: 'Bonusprogramme',
  [AOKContentType.CURAPLAN]: 'Curaplan Programme',
  [AOKContentType.FAMILY]: 'Familie & Kinder',
  [AOKContentType.DIGITAL]: 'Digitale Angebote',
  [AOKContentType.EMERGENCY]: 'Notfall & Bereitschaft',
  [AOKContentType.CONTACT]: 'Kontakt & Support'
}

// Descriptions for documentation and tooltips
export const ContentCategoryDescriptions: Record<ContentCategory, string> = {
  // Base types
  [BaseContentType.INFO]: 'Allgemeine Informationen',
  [BaseContentType.WARNING]: 'Wichtige Hinweise und Warnungen',
  [BaseContentType.ERROR]: 'Fehlermeldungen und Probleme',
  [BaseContentType.SUCCESS]: 'Erfolgsmeldungen und Bestätigungen',

  // Domain types
  [DomainContentType.CITY_ADMINISTRATION]: 'Informationen zur Stadtverwaltung',
  [DomainContentType.MEDICAL]: 'Allgemeine medizinische Informationen',
  [DomainContentType.INSURANCE]: 'Allgemeine Versicherungsinformationen',
  [DomainContentType.SHOPPING_CENTER]: 'Informationen zum Einkaufszentrum',
  [DomainContentType.DEFAULT]: 'Standardinformationen',

  // AOK types
  [AOKContentType.MEDICAL]: 'Informationen zu Krankheiten, Behandlungen und medizinischen Leistungen',
  [AOKContentType.INSURANCE]: 'Details zu Versicherungsleistungen, Tarifen und Zusatzversicherungen',
  [AOKContentType.PREVENTION]: 'Vorsorgeangebote, Gesundheitskurse und Präventionsmaßnahmen',
  [AOKContentType.SERVICE]: 'Allgemeine Serviceleistungen und Beratungsangebote',
  [AOKContentType.BONUS]: 'Informationen zu Bonusprogrammen und Prämien',
  [AOKContentType.CURAPLAN]: 'Spezielle Programme für chronisch kranke Menschen',
  [AOKContentType.FAMILY]: 'Angebote und Leistungen für Familien und Kinder',
  [AOKContentType.DIGITAL]: 'Online-Services, Apps und digitale Gesundheitsangebote',
  [AOKContentType.EMERGENCY]: 'Informationen für Notfälle und ärztliche Bereitschaftsdienste',
  [AOKContentType.CONTACT]: 'Kontaktmöglichkeiten und Supportinformationen'
}