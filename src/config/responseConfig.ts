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

export interface BaseConfig {
  domain: string
  defaultContactUrl: string
  defaultServicesUrl: string
}

export const defaultBaseConfig: BaseConfig = {
  domain: 'https://example.com',
  defaultContactUrl: '/kontakt',
  defaultServicesUrl: '/leistungen'
}

// Automatische URL-Erkennung
export const detectUrlsInText = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  return text.match(urlRegex) || []
}

// Zentrale Konfiguration für alle Antworttypen
export function getResponseConfigs(baseConfig: BaseConfig): ResponseConfig[] {
  return [
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
          url: `${baseConfig.domain}${baseConfig.defaultServicesUrl}social-media/`,
          primary: true
        },
        {
          label: 'Beratungsgespräch vereinbaren',
          url: `${baseConfig.domain}${baseConfig.defaultContactUrl}`
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
          url: `${baseConfig.domain}${baseConfig.defaultServicesUrl}`,
          primary: true
        },
        {
          label: 'Kontakt aufnehmen',
          url: `${baseConfig.domain}${baseConfig.defaultContactUrl}`
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
          url: `${baseConfig.domain}${baseConfig.defaultContactUrl}`,
          primary: true
        }
      ]
    }
  ]
}

// Helper-Funktion zum Erkennen des Antworttyps mit verbesserter Logik
export const getResponseConfig = (text: string, baseConfig: BaseConfig): ResponseConfig => {
  const lowerText = text.toLowerCase()
  
  // Hole die konfigurierten Antworttypen mit den richtigen URLs
  const configs = getResponseConfigs(baseConfig)
  
  // Sortiere Configs nach Priorität
  const sortedConfigs = [...configs].sort((a, b) => 
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
  baseConfig?: BaseConfig
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
          : `${params.baseConfig?.domain || ''}${params.mainUrl}`,
        primary: true
      },
      ...(params.additionalUrls || []).map(({ url, label }) => ({
        label,
        url: url.startsWith('http') ? url : `${params.baseConfig?.domain || ''}${url}`,
        primary: false
      }))
    ]
  }
} 