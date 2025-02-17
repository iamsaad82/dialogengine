export type ContentType = 
  | 'city-administration'
  | 'medical'
  | 'insurance'
  | 'shopping-center'
  | 'default'
  | 'aok-medical'           // Medizinische Leistungen
  | 'aok-prevention'        // Vorsorge und Prävention
  | 'aok-insurance'         // Versicherungsleistungen
  | 'aok-service'           // Service-Angebote
  | 'aok-bonus'            // Bonusprogramme
  | 'aok-curaplan'         // Curaplan-Programme
  | 'aok-family'           // Familienleistungen
  | 'aok-digital'          // Digitale Angebote
  | 'aok-emergency'        // Notfall und Akut
  | 'aok-contact';         // Kontakt und Beratung

export const ContentTypeEnum = {
  CITY_ADMINISTRATION: 'city-administration' as ContentType,
  MEDICAL: 'medical' as ContentType,
  INSURANCE: 'insurance' as ContentType,
  SHOPPING_CENTER: 'shopping-center' as ContentType,
  DEFAULT: 'default' as ContentType,
  AOK_MEDICAL: 'aok-medical' as ContentType,
  AOK_PREVENTION: 'aok-prevention' as ContentType,
  AOK_INSURANCE: 'aok-insurance' as ContentType,
  AOK_SERVICE: 'aok-service' as ContentType,
  AOK_BONUS: 'aok-bonus' as ContentType,
  AOK_CURAPLAN: 'aok-curaplan' as ContentType,
  AOK_FAMILY: 'aok-family' as ContentType,
  AOK_DIGITAL: 'aok-digital' as ContentType,
  AOK_EMERGENCY: 'aok-emergency' as ContentType,
  AOK_CONTACT: 'aok-contact' as ContentType
} as const;

export const CONTENT_TYPES: ContentType[] = [
  'city-administration',
  'medical',
  'insurance',
  'shopping-center',
  'default',
  'aok-medical',
  'aok-prevention',
  'aok-insurance',
  'aok-service',
  'aok-bonus',
  'aok-curaplan',
  'aok-family',
  'aok-digital',
  'aok-emergency',
  'aok-contact'
]

export function isValidContentType(type: string): type is ContentType {
  return CONTENT_TYPES.includes(type as ContentType)
}

export const ContentTypeLabels: Record<ContentType, string> = {
  'city-administration': 'Stadtverwaltung',
  'medical': 'Medizin',
  'insurance': 'Versicherung',
  'shopping-center': 'Einkaufszentrum',
  'default': 'Standard',
  'aok-medical': 'Medizinische Informationen',
  'aok-insurance': 'Versicherungsleistungen',
  'aok-prevention': 'Vorsorge & Prävention',
  'aok-service': 'Service & Beratung',
  'aok-bonus': 'Bonusprogramme',
  'aok-curaplan': 'Curaplan Programme',
  'aok-family': 'Familie & Kinder',
  'aok-digital': 'Digitale Angebote',
  'aok-emergency': 'Notfall & Bereitschaft',
  'aok-contact': 'Kontakt & Support'
}

export const ContentTypeDescriptions: Record<ContentType, string> = {
  'city-administration': 'Informationen zur Stadtverwaltung',
  'medical': 'Allgemeine medizinische Informationen',
  'insurance': 'Allgemeine Versicherungsinformationen',
  'shopping-center': 'Informationen zum Einkaufszentrum',
  'default': 'Standardinformationen',
  'aok-medical': 'Informationen zu Krankheiten, Behandlungen und medizinischen Leistungen',
  'aok-insurance': 'Details zu Versicherungsleistungen, Tarifen und Zusatzversicherungen',
  'aok-prevention': 'Vorsorgeangebote, Gesundheitskurse und Präventionsmaßnahmen',
  'aok-service': 'Allgemeine Serviceleistungen und Beratungsangebote',
  'aok-bonus': 'Informationen zu Bonusprogrammen und Prämien',
  'aok-curaplan': 'Spezielle Programme für chronisch kranke Menschen',
  'aok-family': 'Angebote und Leistungen für Familien und Kinder',
  'aok-digital': 'Online-Services, Apps und digitale Gesundheitsangebote',
  'aok-emergency': 'Informationen für Notfälle und ärztliche Bereitschaftsdienste',
  'aok-contact': 'Kontaktmöglichkeiten und Supportinformationen'
}