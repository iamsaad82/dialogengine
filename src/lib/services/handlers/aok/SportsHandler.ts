import { BaseAOKHandler } from './BaseAOKHandler'
import { AOKHandlerResponse, AOK_TOPICS } from './types'

export class SportsHandler extends BaseAOKHandler {
  constructor() {
    super(AOK_TOPICS.SPORTS, [
      'sport',
      'fitness',
      'bewegung',
      'training',
      'sportmedizin',
      'aktivität',
      'sportlich'
    ])
  }

  async handleQuery(query: string): Promise<AOKHandlerResponse> {
    return {
      type: 'service',
      text: `Die AOK unterstützt Sie bei Ihren sportlichen Aktivitäten:

🔹 Sportmedizinische Untersuchung
- Umfassende Fitness-Checks
- Belastungs-EKG
- Individuelle Trainingsempfehlungen

🔹 Fitness-Programme
- Online-Kurse für verschiedene Fitnesslevel
- Präventionskurse vor Ort
- Personal Training mit qualifizierten Trainern

🔹 Sport-Beratung
- Telefonische Fitness-Beratung
- Individuelle Trainingsplanung
- Ernährungsempfehlungen für Sportler

🔹 Zusätzliche Leistungen
- Zuschüsse für Sportvereine
- Bonusprogramme für regelmäßige Aktivität
- Sport-Apps und digitale Unterstützung`,
      metadata: {
        title: 'Sportangebote',
        description: 'Informationen zu Sportangeboten und Kostenübernahme',
        requirements: [
          'AOK-Mitgliedschaft',
          'Teilnahmebestätigung'
        ],
        costs: {
          amount: 0,
          currency: 'EUR',
          period: 'pro Jahr',
          details: [
            'Die AOK übernimmt bis zu 80% der Kursgebühren',
            'Maximal 2 Kurse pro Jahr'
          ]
        },
        coverage: {
          included: [
            'Sportmedizinische Grunduntersuchung',
            'Präventionskurse',
            'Online-Fitness-Programme',
            'Basis-Gesundheitskurse'
          ],
          excluded: [
            'Sportausrüstung',
            'Private Fitness-Studio-Mitgliedschaften',
            'Wettkampfgebühren'
          ],
          conditions: [
            'Regelmäßige Teilnahme bei Kursen',
            'Vorherige Anmeldung erforderlich'
          ]
        },
        contactPoints: [
          {
            type: 'web',
            value: 'https://www.aok.de/sport',
            description: 'AOK-Sportportal'
          },
          {
            type: 'phone',
            value: '0800 0123456',
            description: 'Sport- und Fitness-Beratung'
          }
        ],
        relatedQuestions: [
          'Welche Sportkurse werden von der AOK bezahlt?',
          'Wie bekomme ich eine sportmedizinische Untersuchung?',
          'Gibt es spezielle Sport-Programme für Anfänger?'
        ]
      }
    }
  }
} 