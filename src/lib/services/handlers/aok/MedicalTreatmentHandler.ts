import { BaseAOKHandler } from './BaseAOKHandler'
import { AOKHandlerResponse, AOK_TOPICS } from './types'

export class MedicalTreatmentHandler extends BaseAOKHandler {
  constructor() {
    super(AOK_TOPICS.MEDICAL_TREATMENT, [
      'behandlung',
      'arzt',
      'krankenhaus',
      'operation',
      'ambulant',
      'stationär',
      'medizinisch',
      'heilbehandlung',
      'notfall',
      'sprechstunde'
    ])
  }

  async handleQuery(query: string): Promise<AOKHandlerResponse> {
    return {
      type: 'medical',
      text: `Die AOK deckt ein breites Spektrum medizinischer Behandlungen ab:

🔹 Ambulante Behandlung
- Hausärztliche Versorgung
- Fachärztliche Behandlung
- Notfallversorgung
- Spezialsprechstunden

🔹 Stationäre Behandlung
- Krankenhausaufenthalte
- Operationen
- Intensivmedizin
- Rehabilitation

🔹 Spezielle Behandlungen
- Alternative Heilmethoden
- Schmerztherapie
- Palliativversorgung
- Telemedizin

🔹 Zusätzliche Leistungen
- Zweitmeinung
- Facharztterminservice
- Medikamentenversorgung
- Hilfsmittelversorgung`,
      metadata: {
        title: 'Medizinische Behandlung',
        description: 'Informationen zu medizinischen Behandlungen und Kostenübernahme',
        requirements: [
          'AOK-Mitgliedschaft',
          'Ärztliche Verordnung bei speziellen Behandlungen'
        ],
        costs: {
          amount: 0,
          currency: 'EUR',
          period: 'pro Quartal',
          details: [
            'Die AOK übernimmt die Kosten für alle medizinisch notwendigen Behandlungen',
            'Praxisgebühr wurde abgeschafft'
          ]
        },
        coverage: {
          included: [
            'Ambulante ärztliche Behandlung',
            'Stationäre Krankenhausbehandlung',
            'Notfallversorgung',
            'Medikamente auf Rezept'
          ],
          excluded: [
            'Schönheitsoperationen',
            'Nicht verschreibungspflichtige Medikamente',
            'Private Zusatzleistungen im Krankenhaus'
          ],
          conditions: [
            'Medizinische Notwendigkeit',
            'Behandlung durch zugelassene Ärzte/Krankenhäuser',
            'Wirtschaftlichkeitsgebot'
          ]
        },
        contactPoints: [
          {
            type: 'web',
            value: 'https://www.aok.de/behandlung',
            description: 'AOK-Behandlungsportal'
          },
          {
            type: 'phone',
            value: '116117',
            description: 'Ärztlicher Bereitschaftsdienst'
          }
        ],
        relatedQuestions: [
          'Wie finde ich einen Facharzt in meiner Nähe?',
          'Was muss ich bei einem Krankenhausaufenthalt beachten?',
          'Welche alternativen Heilmethoden werden von der AOK übernommen?'
        ]
      }
    }
  }
} 