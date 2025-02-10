import { BaseAOKHandler } from './BaseAOKHandler'
import { AOKHandlerResponse, AOK_TOPICS } from './types'

export class NutritionHandler extends BaseAOKHandler {
  constructor() {
    super(AOK_TOPICS.NUTRITION, [
      'ernährung',
      'essen',
      'diät',
      'lebensmittel',
      'nahrung',
      'abnehmen',
      'gewicht'
    ])
  }

  async handleQuery(query: string): Promise<AOKHandlerResponse> {
    return {
      type: 'medical',
      text: `Die AOK bietet umfassende Unterstützung zum Thema Ernährung:

🔹 Ernährungsberatung und Coaching
- Persönliche Beratung durch qualifizierte Ernährungsberater
- Individuelle Ernährungspläne
- Regelmäßige Erfolgskontrollen

🔹 Online-Ernährungskurse
- Flexible Teilnahme von zu Hause
- Interaktive Lernmodule
- Austausch mit anderen Teilnehmern

🔹 Präventionsangebote
- "Abnehmen mit Genuss"
- Kurse für gesunde Ernährung
- Workshops für spezielle Ernährungsformen

🔹 Gesunde Rezepte und Ernährungstipps
- Saisonale Rezeptvorschläge
- Praktische Einkaufstipps
- Nährwertberechnungen`,
      metadata: {
        ...this.getDefaultMetadata(),
        title: 'Ernährungsberatung',
        description: 'Informationen zur Ernährungsberatung und Kostenübernahme',
        requirements: [
          'AOK-Mitgliedschaft',
          'Ärztliche Empfehlung'
        ],
        costs: {
          amount: 0,
          currency: 'EUR',
          period: 'pro Jahr',
          details: [
            'Die AOK übernimmt die Kosten für qualifizierte Ernährungsberatung',
            'Bis zu 5 Beratungstermine pro Jahr'
          ]
        },
        coverage: {
          included: [
            'Individuelle Ernährungsberatung',
            'Präventionskurse',
            'Online-Coaching',
            'Ernährungsseminare'
          ],
          excluded: [
            'Spezielle Diätprodukte',
            'Individuelle Einkaufsbegleitung'
          ],
          conditions: [
            'Regelmäßige Teilnahme bei Kursen',
            'Ärztliche Verordnung bei medizinischer Notwendigkeit'
          ]
        },
        contactPoints: [
          {
            type: 'web',
            value: 'https://www.aok.de/ernaehrung',
            description: 'AOK-Ernährungsportal'
          },
          {
            type: 'phone',
            value: '0800 1234567',
            description: 'Ernährungsberatung-Hotline'
          }
        ],
        relatedQuestions: [
          'Welche Ernährungskurse bietet die AOK an?',
          'Wie finde ich einen Ernährungsberater?',
          'Was sind die Kosten für eine Ernährungsberatung?'
        ]
      }
    }
  }
} 