export interface Action {
  label: string
  url: string
  primary?: boolean
}

export interface ResponseConfig {
  type: string
  match: string[]
  actions: Action[]
  contentType?: string  // z.B. 'list', 'paragraph', 'table'
  priority?: number     // Höhere Priorität wird zuerst geprüft
}

// Basis-URLs für die Website
export const BASE_CONFIG = {
  domain: 'https://sawatzki-muehlenbruch.de',
  defaultContactUrl: '/kontakt/',
  defaultServicesUrl: '/leistungen/'
}

// Automatische URL-Erkennung
export const detectUrlsInText = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  return text.match(urlRegex) || []
}

// Zentrale Konfiguration für alle Antworttypen
export const responseConfigs: ResponseConfig[] = [
  {
    type: 'social-media',
    priority: 100,
    contentType: 'list',
    match: [
      'social media',
      'facebook',
      'instagram',
      'linkedin',
      'social-media-marketing',
      'social media marketing',
      'social-media-strategie',
      'social media strategie'
    ],
    actions: [
      {
        label: 'Social Media Expertise',
        url: `${BASE_CONFIG.domain}/leistungen/social-media/`,
        primary: true
      },
      {
        label: 'Beratungsgespräch vereinbaren',
        url: `${BASE_CONFIG.domain}${BASE_CONFIG.defaultContactUrl}`
      }
    ]
  },
  {
    type: 'services',
    match: [
      'dienstleistung',
      'portfolio',
      'bieten wir',
      'leistungen',
      'angebot',
      'services',
      'beratung'
    ],
    actions: [
      {
        label: 'Alle Leistungen ansehen',
        url: 'https://sawatzki-muehlenbruch.de/leistungen/',
        primary: true
      },
      {
        label: 'Kontakt aufnehmen',
        url: 'https://sawatzki-muehlenbruch.de/kontakt/'
      }
    ]
  },
  {
    type: 'mallcockpit',
    match: [
      'mallcockpit',
      'mall cockpit',
      'mall-cockpit',
      'center management',
      'centermanagement',
      'shopping center'
    ],
    actions: [
      {
        label: 'MallCockpit kennenlernen',
        url: 'https://sawatzki-muehlenbruch.de/mallcockpit/',
        primary: true
      }
    ]
  },
  {
    type: 'contact',
    match: [
      'kontakt',
      'erreichen',
      'anrufen',
      'telefon',
      'email',
      'e-mail',
      'termin',
      'gespräch'
    ],
    actions: [
      {
        label: 'Kontakt aufnehmen',
        url: 'https://sawatzki-muehlenbruch.de/kontakt/',
        primary: true
      }
    ]
  }
]

// Helper-Funktion zum Erkennen des Antworttyps mit verbesserter Logik
export const getResponseConfig = (text: string): ResponseConfig => {
  const lowerText = text.toLowerCase()
  
  // Sortiere Configs nach Priorität
  const sortedConfigs = [...responseConfigs].sort((a, b) => 
    (b.priority || 0) - (a.priority || 0)
  )

  // Finde die erste passende Konfiguration
  const matchedConfig = sortedConfigs.find(config => 
    config.match.some(keyword => lowerText.includes(keyword))
  )

  // Erkenne URLs im Text
  const urls = detectUrlsInText(text)
  
  if (matchedConfig) {
    return {
      ...matchedConfig,
      // Füge gefundene URLs als zusätzliche Aktionen hinzu
      actions: [
        ...matchedConfig.actions,
        ...urls.map(url => ({
          label: 'Direkt zur Seite',
          url,
          primary: false
        }))
      ]
    }
  }

  // Standard-Konfiguration mit automatisch erkannten URLs
  return {
    type: 'default',
    match: [],
    contentType: 'paragraph',
    actions: urls.length > 0 
      ? urls.map(url => ({
          label: 'Mehr erfahren',
          url,
          primary: true
        }))
      : []
  }
}

// Exportiere einen vereinfachten Konfigurations-Builder für Redakteure
export const createResponseConfig = (params: {
  type: string
  keywords: string[]
  mainUrl: string
  mainLabel: string
  additionalUrls?: Array<{ url: string, label: string }>
  contentType?: string
  priority?: number
}): ResponseConfig => {
  return {
    type: params.type,
    match: params.keywords,
    contentType: params.contentType || 'list',
    priority: params.priority || 0,
    actions: [
      {
        label: params.mainLabel,
        url: params.mainUrl.startsWith('http') 
          ? params.mainUrl 
          : `${BASE_CONFIG.domain}${params.mainUrl}`,
        primary: true
      },
      ...(params.additionalUrls || []).map(({ url, label }) => ({
        label,
        url: url.startsWith('http') ? url : `${BASE_CONFIG.domain}${url}`,
        primary: false
      }))
    ]
  }
} 