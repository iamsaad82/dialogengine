import { DynamicHandlerConfig } from '../types'

/**
 * Konfiguration für den Welcome-DynamicHandler
 * Ersetzt den alten WelcomeHandler
 */
export const welcomeConfig: DynamicHandlerConfig = {
  type: 'dynamic',
  name: 'WelcomeDynamicHandler',
  active: true,
  priority: 100,
  responseType: 'info',
  metadata: {
    keyTopics: ['begrüßung', 'willkommen', 'identität'],
    entities: [
      'hallo', 'hi', 'hey', 'guten tag', 'servus', 
      'grüß gott', 'moin', 'wer bist du', 'was kannst du', 
      'wie funktionierst du'
    ],
    facts: [],
    links: {
      internal: [],
      external: [],
      media: []
    },
    relatedTopics: {
      topics: ['hilfe', 'faq', 'funktionen'],
      suggestedQuestions: [
        'Was können Sie mir alles erklären?',
        'Wie funktioniert die Suche?',
        'Welche Themen gibt es?'
      ],
      interactiveElements: []
    }
  },
  responses: [
    {
      type: 'greeting',
      templates: [
        'Hallo! Ich bin Ihr {template.name}-Assistent. Wie kann ich Ihnen helfen?',
        'Guten Tag! Als {template.name}-Assistent unterstütze ich Sie gerne bei Ihren Fragen.',
        'Willkommen! Ich bin der {template.name}-Assistent und freue mich, Ihnen zu helfen.'
      ],
      conditions: {
        patterns: ['^(hallo|hi|hey|guten tag|servus|grüß gott|moin)']
      }
    },
    {
      type: 'identity',
      templates: [
        `🎯 Kernaussage
Ich bin Ihr digitaler AOK-Assistent, speziell entwickelt um Sie bei allen Fragen rund um die AOK zu unterstützen.

📋 Leistungen
- Gesundheitsleistungen und Vorsorge
- Versicherung und Mitgliedschaft
- Anträge und Formulare
- Gesundheitsprogramme
- Service und Kontakt

💡 Gut zu wissen
- Ich kann Ihnen präzise Antworten auf Ihre Fragen geben
- Ich helfe Ihnen bei der Navigation durch unsere Services
- Sie können mir Ihre Fragen in natürlicher Sprache stellen`
      ],
      conditions: {
        patterns: ['^(wer bist du|was bist du|was kannst du|wie funktionierst du)']
      }
    }
  ],
  settings: {
    matchThreshold: 0.8,
    contextWindow: 2,
    maxTokens: 500,
    dynamicResponses: true,
    includeLinks: false,
    includeContact: false,
    includeSteps: false
  }
}