/**
 * @status deprecated
 * @replacement Use DynamicHandler with welcome configuration
 * @usage low
 * @scheduledRemoval 2024-Q2
 */

import { BaseHandler, HandlerRequest } from './base'
import { StructuredResponse } from '../search/types'

export class WelcomeHandler extends BaseHandler {
  public async canHandle(request: HandlerRequest): Promise<boolean> {
    console.log('WelcomeHandler checking query:', request.query)
    
    const welcomePatterns = [
      /^(hallo|hi|hey|guten tag|servus|grüß gott|moin)/i,
      /^(wer bist du|was kannst du|wie funktionierst du)/i
    ]

    // Prüfe Template-spezifische Muster
    const templatePatterns = this.config.patterns || []
    const allPatterns = [...welcomePatterns, ...templatePatterns.map((p: string) => new RegExp(p, 'i'))]

    const matches = allPatterns.some(pattern => {
      const match = pattern.test(request.query.toLowerCase().trim())
      console.log('Testing pattern:', pattern, 'Match:', match)
      return match
    })

    console.log('WelcomeHandler canHandle result:', matches)
    return matches
  }

  public async handle(request: HandlerRequest): Promise<StructuredResponse> {
    console.log('WelcomeHandler handling request:', request)
    
    const templateName = request.metadata?.template?.name || 'AOK'
    const isInitialGreeting = /^(hallo|hi|hey|guten tag|servus|grüß gott|moin)/i.test(request.query)
    const isIdentityQuestion = /^(wer bist du|was kannst du|wie funktionierst du)/i.test(request.query)

    let response: string
    if (isInitialGreeting) {
      response = this.config.template?.response || 
        `Hallo! Ich bin der ${templateName}-Assistent. Wie kann ich Ihnen helfen?`
    } else if (isIdentityQuestion) {
      response = `Ich bin der ${templateName}-Assistent, Ihr digitaler Ansprechpartner für alle Fragen rund um die AOK. Ich wurde speziell dafür entwickelt, Ihnen bei folgenden Themen zu helfen:

🔹 Gesundheitsleistungen und Vorsorge
🔹 Versicherung und Mitgliedschaft
🔹 Anträge und Formulare
🔹 Gesundheitsprogramme
🔹 Service und Kontakt

Sie können mir Ihre Fragen in natürlicher Sprache stellen, und ich werde Ihnen präzise und hilfreiche Antworten geben.`
    } else {
      response = this.config.template?.response ||
        `Ich bin der ${templateName}-Assistent, trainiert um Ihnen bei Fragen zu helfen. ` +
        `Ich kann Informationen in unserer Wissensdatenbank suchen und Ihnen präzise Antworten geben. ` +
        `Stellen Sie mir einfach Ihre Frage!`
    }

    const followup = this.config.template?.followup ||
      'Sie können mir zum Beispiel Fragen zu folgenden Themen stellen:\n' +
      '- Leistungen und Vorteile der AOK\n' +
      '- Gesundheitsprogramme und Vorsorge\n' +
      '- Mitgliedschaft und Beiträge\n' +
      '- Kontaktmöglichkeiten und Service'

    console.log('WelcomeHandler response:', {
      answer: response,
      followup,
      metadata: {
        handler: 'welcome',
        followup,
        deprecated: true,
        replacement: 'DynamicHandler'
      }
    })

    return {
      answer: response,
      confidence: 1.0,
      type: 'info',
      metadata: {
        handler: 'welcome',
        followup,
        deprecated: true,
        replacement: 'DynamicHandler'
      }
    }
  }
} 