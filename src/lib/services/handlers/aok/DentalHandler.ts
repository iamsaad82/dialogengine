import { BaseAOKHandler } from './BaseAOKHandler'
import { AOKHandlerResponse, AOK_TOPICS } from './types'

export class DentalHandler extends BaseAOKHandler {
  constructor() {
    super(AOK_TOPICS.DENTAL, [
      'zahn',
      'zahngesundheit',
      'zahnarzt',
      'zahnersatz',
      'zahnspange',
      'zahnreinigung',
      'zahnvorsorge',
      'implantate',
      'krone',
      'brücke'
    ])
  }

  async handleQuery(query: string): Promise<AOKHandlerResponse> {
    return {
      type: 'medical',
      text: `Die AOK bietet umfassende Leistungen für Ihre Zahngesundheit:

🔹 Zahnvorsorge
- Regelmäßige Kontrolluntersuchungen
- Professionelle Zahnreinigung
- Individualprophylaxe für Kinder und Jugendliche

🔹 Zahnbehandlung
- Schmerzbehandlung
- Füllungen und Wurzelbehandlungen
- Parodontosebehandlungen
- Zahnfleischbehandlungen

🔹 Zahnersatz
- Kronen und Brücken
- Teil- und Vollprothesen
- Implantate
- Festzuschüsse und Bonusregelungen

🔹 Kieferorthopädie
- Zahnspangen für Kinder und Jugendliche
- Erwachsenenbehandlung bei medizinischer Notwendigkeit
- Retainer und Nachsorge`,
      metadata: {
        title: 'Zahnbehandlung',
        description: 'Informationen zur Zahnbehandlung und Kostenübernahme',
        requirements: [
          'AOK-Mitgliedschaft',
          'Zahnärztliche Überweisung'
        ],
        costs: {
          amount: 0,
          currency: 'EUR',
          details: [
            'Die AOK übernimmt die Kosten für zahnärztliche Behandlungen gemäß Leistungskatalog',
            'Für Zahnersatz gelten besondere Konditionen'
          ]
        },
        coverage: {
          included: [
            'Zahnärztliche Kontrolluntersuchungen',
            'Standardfüllungen',
            'Wurzelbehandlungen',
            'Festzuschüsse für Zahnersatz'
          ],
          excluded: [
            'Kosmetische Zahnaufhellung',
            'Nicht medizinisch notwendige Behandlungen',
            'Premium-Materialien'
          ],
          conditions: [
            'Regelmäßige Vorsorge für Bonusleistungen',
            'Genehmigung bei größeren Behandlungen'
          ]
        },
        contactPoints: [
          {
            type: 'web',
            value: 'https://www.aok.de/zahngesundheit',
            description: 'AOK-Zahngesundheitsportal'
          },
          {
            type: 'phone',
            value: '0800 0123456',
            description: 'Zahngesundheits-Hotline'
          }
        ],
        relatedQuestions: [
          'Wie hoch ist der Zuschuss für Zahnersatz?',
          'Was ist der Bonus bei regelmäßiger Vorsorge?',
          'Werden die Kosten für eine Zahnspange übernommen?'
        ]
      }
    }
  }
} 