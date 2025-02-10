import { NextResponse } from 'next/server'

export async function GET() {
  // Beispiel einer strukturierten AOK-Antwort
  const testResponse = {
    type: 'medical',
    title: 'Schwangerschaftsvorsorge bei der AOK',
    text: `Die AOK unterstützt Sie während Ihrer Schwangerschaft umfassend:
🔹 Regelmäßige Vorsorgeuntersuchungen beim Frauenarzt
🔹 Beratung durch Hebammen vor und nach der Geburt
🔹 Geburtsvorbereitungskurse für werdende Eltern
🔹 Zusätzliche Präventionsangebote für Schwangere`,
    metadata: {
      regions: [
        'AOK Baden-Württemberg',
        'AOK Bayern',
        'AOK Nordost'
      ],
      requirements: [
        'Gültige Mitgliedschaft bei der AOK',
        'Ärztlich bestätigte Schwangerschaft',
        'Mutterpass'
      ],
      costs: 'Die AOK übernimmt alle Kosten für die regulären Vorsorgeuntersuchungen. Zusatzleistungen wie 3D-Ultraschall müssen selbst getragen werden.',
      coverage: {
        included: [
          'Alle gesetzlichen Vorsorgeuntersuchungen',
          'Hebammenbetreuung',
          'Geburtsvorbereitungskurs'
        ],
        excluded: [
          '3D/4D-Ultraschall',
          'Zusätzliche Wunschuntersuchungen'
        ],
        conditions: [
          'Rechtzeitige Anmeldung der Schwangerschaft',
          'Einhaltung der Vorsorgetermine'
        ]
      },
      validity: {
        startDate: 'Ab Feststellung der Schwangerschaft',
        endDate: 'Bis 8 Wochen nach der Geburt',
        repeatable: false,
        waitingPeriod: 'Keine Wartezeit'
      },
      contactPoints: [
        {
          type: 'phone',
          value: '0800 033 6704',
          description: 'AOK-Schwangerschaftshotline (kostenfrei)'
        },
        {
          type: 'email',
          value: 'schwangerschaft@aok.de',
          description: 'E-Mail-Beratung für Schwangere'
        },
        {
          type: 'web',
          value: 'https://www.aok.de/schwangerschaft',
          description: 'Online-Portal für werdende Eltern'
        }
      ],
      relatedQuestions: [
        'Welche Zusatzuntersuchungen sind sinnvoll?',
        'Wie finde ich eine Hebamme?',
        'Was ist im Mutterpass dokumentiert?'
      ],
      sources: [
        {
          url: 'https://www.aok.de/schwangerschaft',
          title: 'AOK-Ratgeber: Schwangerschaft',
          snippets: [
            {
              text: 'Umfassende Informationen zu Vorsorge und Betreuung während der Schwangerschaft',
              score: 0.95
            }
          ]
        }
      ]
    }
  }

  return NextResponse.json(testResponse)
} 