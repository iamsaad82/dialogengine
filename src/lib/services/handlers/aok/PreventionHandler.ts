import { BaseAOKHandler } from './BaseAOKHandler'
import { AOKHandlerResponse, AOK_TOPICS } from './types'

export class PreventionHandler extends BaseAOKHandler {
  constructor() {
    super(AOK_TOPICS.CANCER_PREVENTION, [
      'vorsorge',
      'früherkennung',
      'prävention',
      'gesundheitscheck',
      'screening',
      'krebsvorsorge',
      'untersuchung',
      'check-up',
      'vorbeugung',
      'gesundheitsvorsorge'
    ])
  }

  async handleQuery(query: string): Promise<AOKHandlerResponse> {
    return {
      type: 'medical',
      text: `Die AOK bietet umfassende Vorsorge- und Früherkennungsuntersuchungen:

🔹 Allgemeine Vorsorge
- Gesundheits-Check-up (ab 35 Jahren)
- Hautkrebs-Screening
- Zahnvorsorge
- Impfberatung

🔹 Krebsvorsorge
- Mammographie-Screening
- Darmkrebs-Früherkennung
- Gebärmutterhalskrebs-Screening
- Prostatakrebs-Vorsorge

🔹 Spezielle Vorsorge
- Schwangerschaftsvorsorge
- Kindervorsorge (U1-U9)
- Jugendvorsorge (J1)
- Herz-Kreislauf-Check

🔹 Präventionskurse
- Bewegung
- Ernährung
- Stressmanagement
- Suchtprävention`,
      metadata: {
        ...this.getDefaultMetadata(),
        requirements: [
          'AOK-Mitgliedschaft',
          'Altersabhängige Anspruchsberechtigung',
          'Regelmäßige Teilnahme bei Vorsorgeterminen'
        ],
        costs: 'Die meisten Vorsorgeuntersuchungen sind kostenfrei. Für Präventionskurse übernimmt die AOK bis zu 80% der Kosten.',
        coverage: {
          included: [
            'Gesetzliche Vorsorgeuntersuchungen',
            'Krebsfrüherkennung',
            'Gesundheits-Check-ups',
            'Präventionskurse (anteilig)'
          ],
          excluded: [
            'Nicht anerkannte Präventionskurse',
            'Individuelle Gesundheitsleistungen (IGeL)',
            'Reiseimpfungen'
          ],
          conditions: [
            'Einhaltung der Untersuchungsintervalle',
            'Durchführung bei zugelassenen Ärzten',
            'Altersbezogene Voraussetzungen'
          ]
        },
        contactPoints: [
          {
            type: 'web',
            value: 'https://www.aok.de/vorsorge',
            description: 'AOK-Vorsorgeportal'
          },
          {
            type: 'phone',
            value: '0800 0123456',
            description: 'Vorsorge-Beratung'
          }
        ],
        relatedQuestions: [
          'Ab welchem Alter kann ich zur Krebsvorsorge gehen?',
          'Wie oft wird die Mammographie von der AOK bezahlt?',
          'Welche Präventionskurse werden von der AOK bezuschusst?'
        ]
      }
    }
  }
} 