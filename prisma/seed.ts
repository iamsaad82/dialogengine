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
        type: 'examples',
        examples: [
          {
            question: 'Wie funktioniert ihr CMS?',
            answer: 'Unser CMS nutzt KI-gestützte Analyse, um Ihre Inhalte automatisch zu kategorisieren und zu optimieren. Sie können in Echtzeit mit Ihrem Team zusammenarbeiten und erhalten intelligente Vorschläge zur Verbesserung.',
            context: 'CMS-Funktionen',
            type: 'info'
          },
          {
            question: 'Was kann die KI-gestützte Analyse?',
            answer: 'Die KI-gestützte Analyse kategorisiert Ihre Inhalte automatisch, erkennt Zusammenhänge und gibt Ihnen wertvolle Einblicke zur Optimierung. Sie hilft dabei, Ihre Inhalte besser zu strukturieren und für Besucher zugänglicher zu machen.',
            context: 'KI-Analyse',
            type: 'info'
          },
          {
            question: 'Wie funktioniert die Echtzeit-Collaboration?',
            answer: 'Mit unserer Echtzeit-Collaboration können Sie und Ihr Team gleichzeitig an Inhalten arbeiten. Änderungen werden sofort sichtbar, und Sie können direkt Feedback geben. Das macht die Zusammenarbeit effizienter und produktiver.',
            context: 'Collaboration',
            type: 'info'
          }
        ]
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