import { PrismaClient, UserRole } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  // Lösche alle vorhandenen Daten
  await prisma.chatLog.deleteMany()
  await prisma.template.deleteMany()
  await prisma.flowiseConfig.deleteMany()
  await prisma.responseType.deleteMany()
  await prisma.asset.deleteMany()
  await prisma.user.deleteMany()

  // Erstelle Admin User
  const hashedPassword = await bcrypt.hash('admin123', 10)
  await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin User',
      hashedPassword,
      role: UserRole.ADMIN
    }
  })

  // Erstelle Response Types
  await prisma.responseType.create({
    data: {
      name: 'info',
      schema: JSON.stringify({
        type: 'object',
        properties: {
          buttonText: { type: 'string' },
          url: { type: 'string' }
        }
      })
    }
  })

  await prisma.responseType.create({
    data: {
      name: 'contact',
      schema: JSON.stringify({
        type: 'object',
        properties: {
          buttonText: { type: 'string' },
          url: { type: 'string' }
        }
      })
    }
  })

  // Erstelle Demo Assets
  await prisma.asset.create({
    data: {
      type: 'image',
      url: '/showcase-default.png',
      key: 'showcase-default',
      size: 1024,
      mimeType: 'image/png'
    }
  })

  // Erstelle AOK Template
  await prisma.template.create({
    data: {
      name: 'AOK',
      type: 'CUSTOM',
      active: true,
      subdomain: 'aok',
      jsonContent: JSON.stringify({
        hero: {
          title: 'Wir schalten Ihre Website in den Dialog-Modus',
          subtitle: '',
          description: 'Websites sind und bleiben das Herzstück Ihrer digitalen Präsenz. Sie bieten Ihren Besuchern die Möglichkeit, Informationen zu suchen und zu entdecken. Aber es geht auch anders: Stellen Sie einfach Ihre Frage im Dialog-Modus.'
        },
        showcase: {
          image: '',
          altText: '',
          context: {
            title: '169 Artikel und Services zu Gesundheitsfragen durchsuchen?',
            description: 'Ermöglichen Sie Ihren Mitgliedern schnellen Zugriff auf Antworten: Mit der Dialog Engine können Sie 426 Artikel und Services effizient bereitstellen – intuitiv und ohne zusätzlichen Aufwand für Ihr Team.'
          },
          cta: {
            title: 'Oder fragen Sie einfach:',
            question: 'z.B.: Wie lange habe ich Zeit, meine Krankmeldung einzureichen?'
          }
        },
        features: [
          {
            icon: 'brain',
            title: 'Kundenservice entlasten',
            description: 'Die Dialog Engine übernimmt Routinefragen und gibt Ihrem Team Zeit für wichtigere Aufgaben.'
          },
          {
            icon: 'blocks',
            title: 'Datenschutz garantiert',
            description: 'Es werden ausschließlich frei zugängliche Inhalte genutzt – keine sensiblen Daten erforderlich.'
          },
          {
            icon: 'clock',
            title: '24/7 verfügbar',
            description: 'Ihre digitale Unterstützung ist jederzeit für Mitglieder erreichbar – ohne Mehraufwand.'
          },
          {
            icon: 'zap',
            title: 'Einfache Integration',
            description: 'Schnell einsatzbereit und nahtlos in Ihre bestehende Website integriert.'
          }
        ],
        contact: {
          title: 'Sprechen Sie mit uns',
          description: 'Sie möchten mehr über die Dialog Engine erfahren? Unser Team berät Sie gerne zu den Möglichkeiten für Ihre Website.',
          email: 'sb@schickm.ade',
          buttonText: 'Kontakt aufnehmen'
        },
        dialog: {
          title: 'Probieren Sie den Dialog-Modus aus!',
          description: 'In dieser Demo zeigen wir Ihnen, wie einfach es ist, Informationen zu finden – ohne lange Suche! Unser Dialog-Modus beantwortet 10 häufig gestellte Fragen schnell, klar und freundlich. Testen Sie, wie unsere Lösung die Navigation auf Ihrer Website revolutionieren kann!'
        }
      }),
      jsonBranding: JSON.stringify({
        primaryColor: '#005E3F',
        secondaryColor: '#047952',
        backgroundColor: '#ffffff',
        textColor: '#000000',
        logo: '',
        font: 'Inter'
      }),
      jsonBot: JSON.stringify({
        type: 'smart-search',
        smartSearch: {
          provider: 'openai',
          urls: [],  // URLs wurden bereits gescannt
          excludePatterns: [],
          chunkSize: 500,  // Reduziert für präzisere Chunks
          temperature: 0.3,  // Noch konsistentere Antworten
          maxTokens: 1000,
          systemPrompt: "Du bist ein hilfreicher Assistent. Nutze die bereitgestellten Informationen, um präzise und hilfreiche Antworten zu geben. Wenn du nach deiner Identität gefragt wirst, antworte basierend auf den Dokumenten.",
          userPrompt: "Basierend auf den folgenden Informationen, beantworte bitte die Frage: {question}\n\nKontext:\n{context}",
          followupPrompt: "Möchtest du mehr Details zu einem bestimmten Aspekt erfahren?",
          searchConfig: {
            maxResults: 5,
            minScore: 0.7,
            useCache: true,
            timeout: 3000
          },
          reindexInterval: 24,
          maxTokensPerRequest: 400,
          maxPages: 100,
          useCache: true,
          similarityThreshold: 0.3,  // Deutlich reduziert für mehr Ergebnisse
          topK: 100,  // Deutlich erhöht für breitere Suche
          apiKey: process.env.OPENAI_API_KEY,
          indexName: process.env.PINECONE_INDEX,
          apiEndpoint: process.env.PINECONE_HOST,
          searchOptions: {
            includeMetadata: true,
            includeContent: true
          }
        }
      }),
      jsonMeta: JSON.stringify({
        title: 'AOK Dialog Engine Demo',
        description: 'Entdecken Sie, wie die Dialog Engine die Navigation auf Ihrer Website revolutioniert.',
        keywords: ['AOK', 'Dialog Engine', 'Chatbot', 'Kundenservice', 'Gesundheit']
      })
    }
  })

  // Erstelle Default Template
  await prisma.template.create({
    data: {
      id: 'cm6x3ocgb0004ywzwmo65dr04',
      name: 'Demo Template',
      type: 'NEUTRAL',
      active: true,
      subdomain: 'default',
      jsonContent: JSON.stringify({
        hero: {
          title: 'Wir schalten Ihre Website in den Dialog-Modus',
          subtitle: 'Intelligent. Effizient. Zukunftssicher.',
          description: 'Websites sind und bleiben das Herzstück Ihrer digitalen Präsenz. Sie bieten Ihren Besuchern die Möglichkeit, Informationen zu suchen und zu entdecken.'
        },
        showcase: {
          image: '',
          altText: 'KI Content Management Demo',
          context: {
            title: 'Intelligente Inhaltsanalyse',
            description: 'Unsere KI analysiert Ihre Inhalte und gibt Ihnen wertvolle Einblicke zur Optimierung.'
          },
          cta: {
            title: 'Oder fragen Sie einfach:',
            question: 'Wie funktioniert ihr CMS?'
          }
        },
        features: [
          {
            icon: 'blocks',
            title: 'KI-gestützte Analyse',
            description: 'Automatische Analyse und Kategorisierung Ihrer Inhalte'
          },
          {
            icon: 'brain',
            title: 'Intelligente Vorschläge',
            description: 'Erhalten Sie KI-basierte Vorschläge zur Verbesserung Ihrer Inhalte'
          },
          {
            icon: 'clock',
            title: 'Echtzeit-Collaboration',
            description: 'Arbeiten Sie in Echtzeit mit Ihrem Team an Inhalten'
          }
        ],
        contact: {
          title: 'Sprechen Sie mit uns',
          description: 'Sie möchten mehr über die Dialog Engine erfahren? Unser Team berät Sie gerne zu den Möglichkeiten für Ihre Website.',
          email: 'sb@schickma.de',
          buttonText: 'Kontakt aufnehmen'
        },
        dialog: {
          title: 'Probieren Sie den Dialog-Modus aus!',
          description: 'Testen Sie, wie unsere Lösung die Navigation auf Ihrer Website revolutionieren kann!'
        }
      }),
      jsonBranding: JSON.stringify({
        logo: '',
        primaryColor: '#4F46E5',
        secondaryColor: '#7C3AED',
        backgroundColor: '#FFFFFF',
        textColor: '#000000',
        font: 'Inter'
      }),
      jsonBot: JSON.stringify({
        type: 'smart-search',
        smartSearch: {
          provider: 'openai',
          urls: [],
          temperature: 0.3,
          maxTokens: 1000,
          systemPrompt: 'Du bist ein hilfreicher Assistent der AOK, der Fragen basierend auf den bereitgestellten Dokumenten beantwortet. Antworte präzise und faktenbasiert.',
          userPrompt: 'Beantworte die folgende Frage basierend auf dem Kontext: {question}\n\nKontext:\n{context}',
          followupPrompt: 'Hast du noch weitere Fragen zu diesem Thema?',
          pinecone: {
            indexName: 'dialog-engine',
            environment: 'gcp-europe-west4-de1d'
          },
          excludePatterns: ['/admin/*', '/wp-*', '*.pdf', '/wp-json/*', '/api/*'],
          chunkSize: 500,
          reindexInterval: 24,
          maxTokensPerRequest: 1000,
          maxPages: 100,
          useCache: true,
          similarityThreshold: 0.7
        },
        handlers: {
          'aok-medical': {
            type: 'aok-medical',
            active: true,
            metadata: {
              keyTopics: ['Krankheit', 'Symptome', 'Behandlung', 'Therapie', 'Diagnose'],
              entities: ['Krankheiten', 'Medikamente', 'Therapien', 'Ärzte'],
              facts: []
            },
            responses: [
              {
                type: 'info',
                templates: [],
                facts: [],
                content: '',
                context: 'medical'
              }
            ],
            settings: {
              matchThreshold: 0.7,
              contextWindow: 3,
              maxTokens: 1000,
              dynamicResponses: true,
              includeLinks: true,
              includeContact: true,
              includeSteps: true,
              includePrice: false,
              includeAvailability: false,
              useExactMatches: false
            }
          },
          'aok-prevention': {
            type: 'aok-prevention',
            active: true,
            metadata: {
              keyTopics: ['Vorsorge', 'Prävention', 'Gesundheit', 'Früherkennung'],
              entities: ['Vorsorgeuntersuchungen', 'Gesundheitskurse', 'Impfungen'],
              facts: []
            },
            responses: [
              {
                type: 'info',
                templates: [],
                facts: [],
                content: '',
                context: 'prevention'
              }
            ],
            settings: {
              matchThreshold: 0.7,
              contextWindow: 3,
              maxTokens: 1000,
              dynamicResponses: true,
              includeLinks: true,
              includeContact: true,
              includeSteps: true,
              includePrice: true,
              includeAvailability: true,
              useExactMatches: false
            }
          },
          'aok-service': {
            type: 'aok-service',
            active: true,
            metadata: {
              keyTopics: ['Service', 'Beratung', 'Antrag', 'Leistung'],
              entities: ['Geschäftsstellen', 'Berater', 'Formulare'],
              facts: []
            },
            responses: [
              {
                type: 'info',
                templates: [],
                facts: [],
                content: '',
                context: 'service'
              }
            ],
            settings: {
              matchThreshold: 0.7,
              contextWindow: 3,
              maxTokens: 1000,
              dynamicResponses: true,
              includeLinks: true,
              includeContact: true,
              includeSteps: true,
              includePrice: false,
              includeAvailability: false,
              useExactMatches: false
            }
          }
        }
      }),
      jsonMeta: JSON.stringify({
        title: 'Dialog Engine Demo',
        description: 'Entdecken Sie, wie die Dialog Engine die Navigation auf Ihrer Website revolutioniert.',
        domain: '',
        contactUrl: '/kontakt',
        servicesUrl: '/leistungen'
      })
    }
  })

  // Erstelle Default Flowise Config
  await prisma.flowiseConfig.create({
    data: {
      url: 'https://flowise-mallpilot.onrender.com',
      apiKey: '',
      responseRules: JSON.stringify([
        {
          type: 'info',
          pattern: '.*information.*|.*was ist.*|.*wie funktioniert.*',
          metadata: {
            buttonText: 'Mehr erfahren',
            url: '/info'
          }
        },
        {
          type: 'contact',
          pattern: '.*kontakt.*|.*erreichen.*|.*anrufen.*',
          metadata: {
            buttonText: 'Kontakt aufnehmen',
            url: '/kontakt'
          }
        }
      ]),
      defaultButtons: JSON.stringify([
        {
          text: 'Mehr erfahren',
          url: '/info'
        },
        {
          text: 'Kontakt aufnehmen',
          url: '/kontakt'
        }
      ])
    }
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 