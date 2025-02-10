import { BaseHandler, HandlerContext } from '../base'
import { StructuredResponse } from '../../types'

export class ServiceHandler extends BaseHandler {
  private readonly serviceKeywords = [
    'service',
    'angebot',
    'beratung',
    'dienstleistung',
    'termin',
    'buchung',
    'betreuung',
    'unterstützung',
    'hilfe',
    'programm'
  ]

  public async canHandle(context: HandlerContext): Promise<boolean> {
    const query = context.query.toLowerCase()
    return this.serviceKeywords.some(keyword => query.includes(keyword)) ||
           context.type === 'service'
  }

  public async handle(context: HandlerContext): Promise<StructuredResponse> {
    try {
      return this.createResponse('service',
        `Hier sind die verfügbaren Dienstleistungen:

🔹 Persönliche Beratung
- Individuelle Gesundheitsberatung
- Ernährungsberatung
- Bewegungsberatung
- Präventionsberatung

🔹 Online-Services
- Digitale Geschäftsstelle
- Video-Sprechstunde
- Online-Kursbuchung
- E-Learning-Angebote

🔹 Vor-Ort-Services
- Geschäftsstellen
- Mobile Beratung
- Hausbesuche
- Gesundheitskurse`,
        {
          title: 'Service-Angebote',
          description: 'Übersicht über unsere Dienstleistungen und Angebote',
          requirements: [
            'Terminvereinbarung erforderlich',
            'Versichertenkarte mitbringen'
          ],
          costs: {
            amount: 0,
            currency: 'EUR',
            details: [
              'Die meisten Services sind kostenfrei',
              'Einige Zusatzleistungen können kostenpflichtig sein'
            ]
          },
          coverage: {
            included: [
              'Persönliche Beratung',
              'Online-Services',
              'Basis-Gesundheitskurse',
              'Präventionsangebote'
            ],
            excluded: [
              'Kostenpflichtige Premium-Services',
              'Externe Dienstleister'
            ],
            conditions: [
              'Vorherige Anmeldung erforderlich',
              'Teilweise Wartezeiten möglich'
            ]
          },
          actions: [
            {
              type: 'link',
              label: 'Termin vereinbaren',
              url: '/service/termin',
              priority: 1
            },
            {
              type: 'link',
              label: 'Online-Services',
              url: '/service/online',
              priority: 2
            }
          ],
          contactPoints: [
            {
              type: 'web',
              value: 'https://service.aok.de',
              description: 'Online-Servicecenter'
            },
            {
              type: 'phone',
              value: '0800 123456',
              description: 'Service-Hotline'
            }
          ]
        }
      )
    } catch (error) {
      return this.createErrorResponse(error instanceof Error ? error.message : 'Unbekannter Fehler')
    }
  }
}