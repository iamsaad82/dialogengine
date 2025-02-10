import { BaseHandler, HandlerContext } from '../base'
import { StructuredResponse } from '../../types'

export class InsuranceHandler extends BaseHandler {
  private readonly insuranceKeywords = [
    'versicherung',
    'versichert',
    'leistung',
    'beitrag',
    'tarif',
    'aok',
    'krankenkasse',
    'kasse',
    'gesetzlich',
    'privat'
  ]

  public async canHandle(context: HandlerContext): Promise<boolean> {
    const query = context.query.toLowerCase()
    const hasKeyword = this.insuranceKeywords.some(keyword => query.includes(keyword))
    
    console.log('InsuranceHandler.canHandle:', {
      query,
      hasKeyword,
      type: context.type,
      matchedKeywords: this.insuranceKeywords.filter(keyword => query.includes(keyword))
    })
    
    return hasKeyword || context.type === 'insurance'
  }

  public async handle(context: HandlerContext): Promise<StructuredResponse> {
    try {
      console.log('InsuranceHandler verarbeitet Anfrage:', context)
      
      return this.createResponse('insurance', 
        `Die AOK bietet als gesetzliche Krankenkasse ein umfassendes Leistungspaket:

🏥 Medizinische Grundversorgung
- Ärztliche und zahnärztliche Behandlung
- Krankenhausaufenthalte
- Medikamente und Hilfsmittel
- Vorsorgeuntersuchungen

💪 Zusätzliche Leistungen
- Bonusprogramme für gesundheitsbewusstes Verhalten
- Präventionskurse
- Alternative Heilmethoden
- Digitale Gesundheitsangebote

👨‍👩‍👧‍👦 Familienleistungen
- Kostenfreie Familienversicherung
- Mutterschaftsleistungen
- Kinder- und Jugendvorsorge

🌟 Service
- Online-Geschäftsstelle
- 24/7 Telefonberatung
- Digitale Gesundheitsakte`,
        {
          title: 'AOK Leistungsübersicht',
          description: 'Informationen zu den Leistungen der AOK',
          requirements: [
            'AOK-Mitgliedschaft',
            'Gültiger Versicherungsnachweis'
          ],
          costs: {
            amount: 0,
            currency: "EUR",
            period: "monatlich",
            details: [
              "Beitrag abhängig vom Einkommen",
              "Durchschnittlich 15,9% vom Bruttoeinkommen",
              "Arbeitgeber übernimmt die Hälfte"
            ]
          },
          coverage: {
            included: [
              'Ärztliche Behandlungen',
              'Krankenhausaufenthalte',
              'Medikamente',
              'Vorsorgeuntersuchungen',
              'Rehabilitation'
            ],
            excluded: [
              'Individuelle Zusatzleistungen',
              'Bestimmte alternative Heilmethoden'
            ],
            conditions: [
              'Gültige Mitgliedschaft',
              'Rechtzeitige Beitragszahlung'
            ]
          },
          actions: [
            {
              type: 'link',
              label: 'Leistungskatalog',
              url: 'https://www.aok.de/leistungen',
              priority: 1
            },
            {
              type: 'link',
              label: 'Mitglied werden',
              url: 'https://www.aok.de/mitgliedschaft',
              priority: 2
            }
          ],
          contactPoints: [
            {
              type: 'phone',
              value: '0800 0123456',
              description: 'AOK-Servicetelefon'
            },
            {
              type: 'web',
              value: 'https://www.aok.de',
              description: 'AOK-Website'
            }
          ]
        }
      )
    } catch (error) {
      console.error('Fehler im InsuranceHandler:', error)
      return this.createErrorResponse(error instanceof Error ? error.message : 'Unbekannter Fehler')
    }
  }
}