import { BaseAOKHandler } from './BaseAOKHandler'
import { AOKHandlerResponse, AOK_TOPICS } from './types'

export class TherapyHandler extends BaseAOKHandler {
  constructor() {
    super(AOK_TOPICS.THERAPY, [
      'therapie',
      'physiotherapie',
      'ergotherapie',
      'logopädie',
      'psychotherapie',
      'ernährungstherapie',
      'podologie',
      'heilmittel',
      'reha',
      'rehabilitation'
    ])
  }

  async handleQuery(query: string): Promise<AOKHandlerResponse> {
    return {
      type: 'medical',
      text: `Die AOK bietet verschiedene Therapiemöglichkeiten:

🔹 Physiotherapie
- Krankengymnastik
- Manuelle Therapie
- Massagen
- Wärmetherapie

🔹 Ergotherapie & Logopädie
- Motorische Förderung
- Sprachtherapie
- Schlucktherapie
- Handlungstraining

🔹 Psychotherapie
- Einzeltherapie
- Gruppentherapie
- Online-Angebote
- Akutsprechstunden

🔹 Spezialtherapien
- Ernährungstherapie
- Podologische Behandlung
- Soziotherapie
- Selbsthilfegruppen`,
      metadata: {
        title: 'Therapieangebote',
        description: 'Informationen zu Therapieangeboten und Kostenübernahme',
        requirements: [
          'AOK-Mitgliedschaft',
          'Ärztliche Verordnung'
        ],
        costs: {
          amount: 0,
          currency: 'EUR',
          period: 'pro Verordnung',
          details: [
            'Die AOK übernimmt die Kosten für ärztlich verordnete Therapien',
            'Gesetzliche Zuzahlung von 10€ pro Verordnung'
          ]
        },
        coverage: {
          included: [
            'Verordnete Heilmittel',
            'Psychotherapeutische Behandlungen',
            'Ernährungsberatung bei medizinischer Notwendigkeit',
            'Podologische Behandlungen bei Diabetikern'
          ],
          excluded: [
            'Nicht verschreibungspflichtige Therapien',
            'Wellness-Anwendungen',
            'Präventive Massagen'
          ],
          conditions: [
            'Ärztliche Verordnung notwendig',
            'Regelmäßige Teilnahme',
            'Therapieplan-Einhaltung'
          ]
        },
        contactPoints: [
          {
            type: 'web',
            value: 'https://www.aok.de/therapien',
            description: 'AOK-Therapieportal'
          },
          {
            type: 'phone',
            value: '0800 0123456',
            description: 'Therapie-Beratung'
          }
        ],
        relatedQuestions: [
          'Wie bekomme ich eine Physiotherapie verschrieben?',
          'Welche Psychotherapeuten arbeiten mit der AOK zusammen?',
          'Was ist der Unterschied zwischen Ergo- und Physiotherapie?'
        ]
      }
    }
  }
} 