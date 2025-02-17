export type ContentType = 'info' | 'warning' | 'error' | 'success'

export type ContentCategory = 
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
  | 'aok-contact'          // Kontakt und Beratung

export const ContentTypes = {
  Info: 'info' as ContentType,
  Warning: 'warning' as ContentType,
  Error: 'error' as ContentType,
  Success: 'success' as ContentType
} as const

export const ContentTypeEnum = {
  CityAdministration: 'city-administration' as ContentCategory,
  Medical: 'medical' as ContentCategory,
  Insurance: 'insurance' as ContentCategory,
  ShoppingCenter: 'shopping-center' as ContentCategory,
  Default: 'default' as ContentCategory,
  AOKMedical: 'aok-medical' as ContentCategory,
  AOKPrevention: 'aok-prevention' as ContentCategory,
  AOKInsurance: 'aok-insurance' as ContentCategory,
  AOKService: 'aok-service' as ContentCategory,
  AOKBonus: 'aok-bonus' as ContentCategory,
  AOKCuraPlan: 'aok-curaplan' as ContentCategory,
  AOKFamily: 'aok-family' as ContentCategory,
  AOKDigital: 'aok-digital' as ContentCategory,
  AOKEmergency: 'aok-emergency' as ContentCategory,
  AOKContact: 'aok-contact' as ContentCategory
} as const

export const CONTENT_CATEGORIES: ContentCategory[] = [
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

export function isValidContentCategory(type: string): type is ContentCategory {
  return CONTENT_CATEGORIES.includes(type as ContentCategory)
}

export const ContentCategoryLabels: Record<ContentCategory, string> = {
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

export const ContentCategoryDescriptions: Record<ContentCategory, string> = {
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