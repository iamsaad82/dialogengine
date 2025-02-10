import { BaseAOKHandler } from './BaseAOKHandler'
import { AOKHandlerResponse, AOK_TOPICS } from './types'

export class VisionHearingHandler extends BaseAOKHandler {
  constructor() {
    super(AOK_TOPICS.VISION_HEARING, [
      'sehen',
      'hören',
      'brille',
      'hörgerät',
      'augen',
      'ohren',
      'sehschwäche',
      'hörschwäche',
      'optiker',
      'akustiker'
    ])
  }

  async handleQuery(query: string): Promise<AOKHandlerResponse> {
    return {
      type: 'medical',
      text: `Die AOK unterstützt Sie bei Seh- und Hörschwächen:

🔹 Sehhilfen
- Brillen für Kinder und Jugendliche
- Kontaktlinsen
- Spezielle Sehhilfen
- Vorsorgeuntersuchungen

🔹 Hörhilfen
- Hörgeräte
- Batterien
- Wartung und Reparatur
- Hörtraining

🔹 Zusätzliche Leistungen
- Augendruckmessung
- Hörtest
- Tinnitus-Therapie
- Sehschule für Kinder

🔹 Präventionsangebote
- Augengesundheit
- Gehörschutz
- Sehtraining
- Hörsturz-Prävention`,
      metadata: {
        ...this.getDefaultMetadata(),
        requirements: [
          'AOK-Mitgliedschaft',
          'Ärztliche Verordnung',
          'Regelmäßige Kontrollen',
          'Altersspezifische Voraussetzungen'
        ],
        costs: 'Die AOK beteiligt sich an den Kosten für Seh- und Hörhilfen. Die Höhe der Zuzahlung richtet sich nach Alter und Schweregrad.',
        coverage: {
          included: [
            'Sehhilfen für Kinder und Jugendliche',
            'Medizinisch notwendige Hörhilfen',
            'Vorsorgeuntersuchungen',
            'Reparaturen von Hilfsmitteln'
          ],
          excluded: [
            'Modische Extras bei Brillen',
            'Hochwertige Designergestelle',
            'Nicht verschreibungspflichtige Sehhilfen'
          ],
          conditions: [
            'Nachgewiesene Seh- oder Hörschwäche',
            'Regelmäßige Kontrolluntersuchungen',
            'Verordnung durch Facharzt'
          ]
        },
        contactPoints: [
          {
            type: 'web',
            value: 'https://www.aok.de/hilfsmittel',
            description: 'AOK-Hilfsmittelportal'
          },
          {
            type: 'phone',
            value: '0800 0123456',
            description: 'Hilfsmittel-Beratung'
          }
        ],
        relatedQuestions: [
          'Wann übernimmt die AOK die Kosten für eine Brille?',
          'Wie oft habe ich Anspruch auf ein neues Hörgerät?',
          'Welche Vorsorgeuntersuchungen gibt es für die Augen?'
        ]
      }
    }
  }
} 