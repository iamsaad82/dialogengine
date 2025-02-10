import { BaseAOKHandler } from './BaseAOKHandler'
import { AOKHandlerResponse, AOK_TOPICS } from './types'

export class FamilyHandler extends BaseAOKHandler {
  constructor() {
    super(AOK_TOPICS.FAMILY, [
      'familie',
      'kind',
      'kinder',
      'baby',
      'jugendliche',
      'eltern',
      'familienversicherung',
      'kindergesundheit',
      'schwangerschaft',
      'geburt'
    ])
  }

  async handleQuery(query: string): Promise<AOKHandlerResponse> {
    return {
      type: 'medical',
      text: `Die AOK bietet umfassende Leistungen für Familien:

🔹 Schwangerschaft & Geburt
- Vorsorgeuntersuchungen
- Hebammenbetreuung
- Geburtsvorbereitungskurse
- Nachsorge

🔹 Kindervorsorge
- U-Untersuchungen (U1-U9)
- Impfungen
- Zahnvorsorge
- J1-Jugenduntersuchung

🔹 Familienversicherung
- Kostenlose Mitversicherung
- Familienorientierte Angebote
- Haushaltshilfe
- Kinderkrankengeld

🔹 Spezielle Angebote
- Familiensport
- Ernährungsberatung
- Stressmanagement
- Familientherapie`,
      metadata: {
        ...this.getDefaultMetadata(),
        requirements: [
          'AOK-Mitgliedschaft eines Elternteils',
          'Nachweis der Familienzugehörigkeit',
          'Altersgrenzen bei bestimmten Leistungen'
        ],
        costs: 'Die meisten Familienleistungen sind kostenfrei. Für spezielle Angebote können Zuzahlungen anfallen.',
        coverage: {
          included: [
            'Vorsorgeuntersuchungen für Kinder',
            'Schwangerschaftsvorsorge',
            'Familienversicherung',
            'Kinderkrankengeld'
          ],
          excluded: [
            'Nicht medizinisch notwendige Leistungen',
            'Private Zusatzangebote',
            'Bestimmte Freizeitaktivitäten'
          ],
          conditions: [
            'Regelmäßige Teilnahme an Vorsorgeuntersuchungen',
            'Einhaltung von Altersgrenzen',
            'Anmeldung der Familienversicherung'
          ]
        },
        contactPoints: [
          {
            type: 'web',
            value: 'https://www.aok.de/familie',
            description: 'AOK-Familienportal'
          },
          {
            type: 'phone',
            value: '0800 0123456',
            description: 'Familienberatung'
          }
        ],
        relatedQuestions: [
          'Wie funktioniert die Familienversicherung?',
          'Welche Vorsorgeuntersuchungen gibt es für mein Kind?',
          'Wann bekomme ich Kinderkrankengeld?'
        ]
      }
    }
  }
} 