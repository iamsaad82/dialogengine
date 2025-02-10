import { BaseHandler, HandlerContext, HandlerConfig } from '../base'
import { StructuredResponse } from '../../types'
import { Redis } from 'ioredis'

export class MedicalHandler extends BaseHandler {
  private readonly redis?: Redis;
  private readonly keywords: Array<{
    terms: string[],
    topic?: string
  }>;

  constructor(config: HandlerConfig) {
    super(config);
    this.redis = config.redisUrl ? new Redis(config.redisUrl) : undefined;
    
    this.keywords = [
      {
        terms: ['elektronische patientenakte', 'epa', 'patientenakte'],
        topic: 'epa'
      },
      {
        terms: ['krankenhaus', 'klinik', 'stationär', 'stationäre behandlung'],
        topic: 'krankenhaus'
      },
      {
        terms: ['krankschreibung', 'krankmeldung', 'arbeitsunfähigkeit'],
        topic: 'au'
      },
      {
        terms: ['termin', 'arzttermin', 'sprechstunde'],
        topic: 'termine'
      }
    ];
  }

  async canHandle(context: HandlerContext): Promise<boolean> {
    const startTime = performance.now();
    const query = context.query.toLowerCase();
    
    // 1. Prüfe auf Follow-up-Frage mit medizinischem Kontext
    if (context.metadata?.previousContext) {
      const prevContext = context.metadata.previousContext;
      const prevContent = typeof prevContext === 'string' ? prevContext : prevContext.content;
      
      // Wenn der vorherige Kontext medizinisch war (enthält medizinische Keywords)
      const hasMedicalContext = this.keywords.some(keyword => 
        keyword.terms.some(term => prevContent.toLowerCase().includes(term))
      );
      
      if (hasMedicalContext) {
        // Und es ist eine Follow-up-Frage
        if (this.checkFollowUpPatterns(query)) {
          console.log('MedicalHandler - Follow-up detected:', {
            query,
            prevContent: prevContent.substring(0, 100) + '...',
            duration: `${performance.now() - startTime}ms`
          });
          return true;
        }
      }
    }
    
    // 2. Prüfe auf neue medizinische Keywords
    for (const keyword of this.keywords) {
      const matchedTerms = keyword.terms.filter(term => query.includes(term));
      if (matchedTerms.length > 0) {
        console.log('MedicalHandler - Keyword match:', {
          query,
          matchedTerms,
          topic: keyword.topic,
          duration: `${performance.now() - startTime}ms`
        });
        return true;
      }
    }
    
    return false;
  }

  private checkFollowUpPatterns(query: string): boolean {
    const followUpPatterns = [
      'und',
      'aber',
      'oder',
      'wenn',
      'was ist mit',
      'wie ist es mit',
      'gibt es auch',
      'kann ich auch',
      'was passiert',
      'wie lange',
      'wie viel',
      'wie oft',
      'wann',
      'wo',
      'wer',
      'welche'
    ];
    
    return followUpPatterns.some(pattern => 
      query.toLowerCase().trim().startsWith(pattern.toLowerCase())
    );
  }

  async handle(context: HandlerContext): Promise<StructuredResponse> {
    console.log('MedicalHandler - Processing request:', context);
    const startTime = performance.now();
    
    try {
      const query = context.query.toLowerCase();
      let topic: string | undefined;
      let aspect: string | undefined;
      
      // Bestimme das spezifische Thema
      for (const keyword of this.keywords) {
        if (keyword.terms.some(term => query.includes(term))) {
          topic = keyword.topic;
          break;
        }
      }

      // Prüfe auf Follow-up-Frage
      const isFollowUp = this.checkFollowUpPatterns(query);
      if (isFollowUp && context.metadata?.previousContext) {
        const prevContext = context.metadata.previousContext;
        const prevContent = typeof prevContext === 'string' ? prevContext : prevContext.content;
        
        // Suche nach medizinischen Keywords im vorherigen Kontext
        if (!topic) {
          for (const keyword of this.keywords) {
            if (keyword.terms.some(term => prevContent.toLowerCase().includes(term))) {
              topic = keyword.topic;
              break;
            }
          }
        }
      }

      // Bestimme den spezifischen Aspekt
      aspect = this.determineAspect(query);
      console.log('MedicalHandler - Context analysis:', { 
        topic, 
        aspect, 
        isFollowUp,
        previousContext: context.metadata?.previousContext 
      });
      
      switch (topic) {
        case 'krankenhaus':
          // Bei Follow-up-Fragen spezifische Aspekte behandeln
          if (aspect) {
            switch (aspect) {
              case 'dauer':
                return this.createResponse(
                  'medical',
                  `Bei längeren Krankenhausaufenthalten gilt:

🔹 Maximale Zuzahlung
- Höchstens 280 € pro Jahr (28 Tage)
- Danach keine weiteren Zuzahlungen im selben Jahr
- Gilt auch bei mehreren Aufenthalten

🔹 Zusätzliche Unterstützung
- Krankengeld bei längerer Arbeitsunfähigkeit
- Unterstützung bei der Reha-Organisation
- Sozialberatung für weitere Hilfen
- Überleitung in die Pflege bei Bedarf

🔹 Besondere Leistungen
- Anschlussheilbehandlung (AHB)
- Häusliche Krankenpflege
- Haushaltshilfe bei Bedarf
- Unterstützung für Angehörige`,
                  {
                    title: 'Längere Krankenhausaufenthalte',
                    description: 'Informationen zu längeren Aufenthalten und Unterstützung',
                    topics: ['krankenhaus'],
                    type: 'medical',
                    context: {
                      isFollowUp,
                      previousContext: context.metadata?.previousContext,
                      aspects: ['dauer']
                    },
                    requirements: [
                      'Medizinische Notwendigkeit',
                      'Dokumentation durch Krankenhaus',
                      'Antrag auf Krankengeld bei Arbeitsunfähigkeit'
                    ],
                    coverage: {
                      included: [
                        'Verlängerte stationäre Behandlung',
                        'Anschlussheilbehandlung',
                        'Krankengeld',
                        'Sozialberatung'
                      ]
                    }
                  }
                );
              case 'kosten':
                return this.createResponse(
                  'medical',
                  `Zu den Kosten im Krankenhaus:

🔹 Zuzahlungsregelung
- 10 € pro Tag für maximal 28 Tage
- Maximalbetrag: 280 € pro Jahr
- Weitere Aufenthalte im selben Jahr kostenfrei

🔹 Befreiungsmöglichkeiten
- Bei Überschreitung der Belastungsgrenze
- Für Kinder und Jugendliche unter 18
- Bei Schwangerschaftsbeschwerden
- Bei bestimmten chronischen Erkrankungen

🔹 Zusatzkosten vermeiden
- Keine Zuzahlung für Notfalleinweisung
- Standardversorgung komplett abgedeckt
- Wahlleistungen vorher besprechen
- Zusatzversicherung prüfen`,
                  {
                    title: 'Krankenhauskosten',
                    description: 'Detaillierte Informationen zu Kosten und Zuzahlungen',
                    costs: {
                      amount: 10,
                      currency: 'EUR',
                      period: 'pro Tag',
                      details: [
                        'Maximale Zuzahlung: 280 € pro Jahr',
                        'Befreiungsmöglichkeiten verfügbar',
                        'Zusatzkosten nur bei Sonderleistungen'
                      ]
                    }
                  }
                );
              default:
                return this.createKrankenhausResponse();
            }
          }
          return this.createKrankenhausResponse();
        
        case 'epa':
          return this.createEPAResponse();
        
        default:
          return this.createResponse(
            'medical',
            'Entschuldigung, zu diesem speziellen medizinischen Thema habe ich leider keine detaillierten Informationen. Bitte wenden Sie sich an unseren Kundenservice.',
            {
              error: 'Kein spezifischer Content für dieses Thema verfügbar'
            }
          );
      }
    } catch (error) {
      console.error('MedicalHandler - Error:', error);
      return this.createErrorResponse(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      console.log(`MedicalHandler - Response generated in ${performance.now() - startTime}ms`);
    }
  }

  private determineAspect(query: string): string | undefined {
    const aspects = {
      dauer: ['länger', 'lange', 'zeit', 'dauer', 'aufenthalt', 'bleiben'],
      kosten: ['kosten', 'geld', 'zahlen', 'teuer', 'preis', 'zuzahlung']
    };

    for (const [aspect, keywords] of Object.entries(aspects)) {
      if (keywords.some(keyword => query.includes(keyword))) {
        return aspect;
      }
    }
    
    return undefined;
  }

  private async createKrankenhausResponse(): Promise<StructuredResponse> {
    return this.createResponse(
      'medical',
      `Bei einem Krankenhausaufenthalt übernimmt die AOK folgende Leistungen:

🔹 Stationäre Behandlung
- Alle medizinisch notwendigen Untersuchungen
- Operationen und Behandlungen
- Medikamente und Heilmittel
- Pflegerische Versorgung
- Unterbringung und Verpflegung

🔹 Zuzahlung & Kosten
- 10 € Zuzahlung pro Tag für maximal 28 Tage im Jahr
- Keine Zuzahlung für Kinder unter 18 Jahren
- Mögliche Befreiung bei Überschreitung der Belastungsgrenze

🔹 Zusätzliche Leistungen
- Transport zum Krankenhaus (bei medizinischer Notwendigkeit)
- Anschlussheilbehandlung/Reha (wenn erforderlich)
- Häusliche Krankenpflege nach Entlassung

🔹 Bei längeren Aufenthalten
- Maximale Zuzahlung von 280 € pro Jahr
- Unterstützung bei der Organisation von Reha-Maßnahmen
- Beratung zu Pflegeleistungen bei Bedarf
- Hilfe bei der Beantragung von Krankengeld`,
      {
        title: 'Krankenhausaufenthalt',
        description: 'Leistungen der AOK bei stationärer Behandlung',
        requirements: [
          'AOK-Mitgliedschaft',
          'Ärztliche Einweisung (außer bei Notfällen)',
          'Gültige Versichertenkarte'
        ],
        costs: {
          amount: 10,
          currency: 'EUR',
          period: 'pro Tag',
          details: [
            'Maximale Zuzahlung: 280 € pro Jahr (28 Tage)',
            'Befreiungsmöglichkeit bei Überschreitung der Belastungsgrenze',
            'Keine Zuzahlung für Kinder unter 18 Jahren'
          ]
        },
        coverage: {
          included: [
            'Medizinische Behandlungen',
            'Operationen',
            'Medikamente',
            'Pflegerische Versorgung',
            'Unterbringung und Verpflegung',
            'Krankentransport bei medizinischer Notwendigkeit'
          ],
          excluded: [
            'Einzelzimmer (ohne medizinische Notwendigkeit)',
            'Chefarztbehandlung (ohne Zusatzversicherung)',
            'Telefon/TV (wenn nicht inklusive)'
          ],
          conditions: [
            'Medizinische Notwendigkeit muss gegeben sein',
            'Einweisung durch Arzt (außer Notfall)'
          ]
        },
        contactPoints: [
          {
            type: 'phone',
            value: '0800 0123456',
            description: 'AOK-Gesundheitstelefon'
          },
          {
            type: 'web',
            value: 'https://www.aok.de/krankenhaus',
            description: 'Weitere Informationen online'
          }
        ]
      }
    );
  }

  private async createEPAResponse(): Promise<StructuredResponse> {
    return this.createResponse(
      'medical',
      `Die elektronische Patientenakte (ePA) ist ein wichtiges digitales Gesundheitstool:

🔹 Vorteile der ePA
- Alle wichtigen Gesundheitsdaten an einem Ort
- Sichere digitale Speicherung
- Einfacher Zugriff für Sie und Ihre Ärzte
- Bessere Koordination Ihrer Behandlungen

🔹 So funktioniert's
- Kostenlose Aktivierung in Ihrer AOK-App
- Selbstbestimmte Datenverwaltung
- Hohe Sicherheitsstandards
- Freiwillige Nutzung

🔹 Diese Dokumente können Sie speichern
- Befunde und Diagnosen
- Medikationsplan
- Impfpass
- Mutterpass
- Zahnbonusheft
- Laborwerte
- Röntgenbilder`,
      {
        title: 'Elektronische Patientenakte (ePA)',
        description: 'Informationen zur elektronischen Patientenakte der AOK',
        requirements: [
          'AOK-Mitgliedschaft',
          'Smartphone oder Computer mit Internet',
          'AOK-App oder Zugang zum Online-Portal'
        ],
        actions: [
          {
            type: 'link',
            label: 'ePA aktivieren',
            url: 'https://www.aok.de/epa/aktivieren',
            priority: 1
          },
          {
            type: 'link',
            label: 'Mehr Informationen',
            url: 'https://www.aok.de/epa/info',
            priority: 2
          }
        ],
        contactPoints: [
          {
            type: 'phone',
            value: '0800 0123456',
            description: 'ePA-Support-Hotline'
          }
        ]
      }
    );
  }
}