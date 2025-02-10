import { BaseAOKHandler } from './BaseAOKHandler'
import { AOKHandlerResponse, AOK_TOPICS } from './types'

export class RehabilitationHandler extends BaseAOKHandler {
  constructor() {
    super(AOK_TOPICS.REHABILITATION, [
      'kur',
      'reha',
      'rehabilitation',
      'heilkur',
      'vorsorgekur',
      'mutter-kind-kur',
      'anschlussheilbehandlung',
      'ahb',
      'sanatorium',
      'kuraufenthalt'
    ])
  }

  async handleQuery(query: string): Promise<AOKHandlerResponse> {
    return {
      type: 'medical',
      text: `Die AOK unterstützt Sie bei Kuren und Rehabilitationsmaßnahmen:

🔹 Medizinische Rehabilitation
- Stationäre Rehabilitation
- Ambulante Rehabilitation
- Anschlussheilbehandlung (AHB)
- Berufliche Rehabilitation

🔹 Vorsorge- und Heilkuren
- Ambulante Vorsorgekuren
- Stationäre Vorsorgekuren
- Mutter-/Vater-Kind-Kuren
- Klimakuren

🔹 Spezielle Reha-Programme
- Suchtrehabilitation
- Psychosomatische Rehabilitation
- Orthopädische Rehabilitation
- Neurologische Rehabilitation

🔹 Ergänzende Leistungen
- Rehabilitationssport
- Funktionstraining
- Nachsorgeprogramme
- Patientenschulungen`,
      metadata: {
        ...this.getDefaultMetadata(),
        requirements: [
          'AOK-Mitgliedschaft',
          'Ärztliche Verordnung',
          'Medizinische Notwendigkeit',
          'Genehmigung durch die AOK'
        ],
        costs: 'Die AOK übernimmt die Kosten für genehmigte Rehabilitationsmaßnahmen. Es fällt eine gesetzliche Zuzahlung von 10 Euro pro Tag an.',
        coverage: {
          included: [
            'Stationäre und ambulante Rehabilitation',
            'Vorsorge- und Heilkuren',
            'Mutter-/Vater-Kind-Kuren',
            'Anschlussheilbehandlung'
          ],
          excluded: [
            'Nicht medizinisch notwendige Kuren',
            'Reine Erholungsaufenthalte',
            'Private Zusatzleistungen'
          ],
          conditions: [
            'Ausschöpfung ambulanter Behandlungsmöglichkeiten',
            'Positive Rehabilitationsprognose',
            'Rehabilitationsfähigkeit'
          ]
        },
        contactPoints: [
          {
            type: 'web',
            value: 'https://www.aok.de/reha',
            description: 'AOK-Rehabilitationsportal'
          },
          {
            type: 'phone',
            value: '0800 0123456',
            description: 'Reha-Beratung'
          }
        ],
        relatedQuestions: [
          'Wie beantrage ich eine Rehabilitation?',
          'Welche Voraussetzungen gibt es für eine Mutter-Kind-Kur?',
          'Was ist der Unterschied zwischen ambulanter und stationärer Reha?'
        ]
      }
    }
  }
} 