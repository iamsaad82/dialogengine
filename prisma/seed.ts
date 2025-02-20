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
      description: 'AOK Template für die Dialog Engine',
      
      // Content
      content: {
        sections: [
          {
            type: 'hero',
            content: {
              title: 'Wir schalten Ihre Website in den Dialog-Modus',
              subtitle: '',
              description: 'Websites sind und bleiben das Herzstück Ihrer digitalen Präsenz. Sie bieten Ihren Besuchern die Möglichkeit, Informationen zu suchen und zu entdecken. Aber es geht auch anders: Stellen Sie einfach Ihre Frage im Dialog-Modus.'
            }
          },
          {
            type: 'showcase',
            content: {
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
            }
          }
        ],
        metadata: {}
      },
      
      // Branding
      branding: {
        logo: '',
        colors: {
          primary: '#005E3F',
          secondary: '#047952',
          accent: '#00A86B'
        },
        fonts: {
          heading: 'Inter',
          body: 'Inter'
        }
      },
      
      // Config
      config: {
        smartSearch: {
          provider: 'openai',
          urls: [],
          excludePatterns: [],
          chunkSize: 500,
          temperature: 0.3,
          maxTokens: 1000
        }
      },
      
      // Handlers
      handlers: [],
      
      // Responses
      responses: {
        templates: [],
        rules: []
      },
      
      // Meta
      meta: {
        title: 'AOK Dialog Engine Demo',
        description: 'Entdecken Sie, wie die Dialog Engine die Navigation auf Ihrer Website revolutioniert.',
        keywords: ['AOK', 'Dialog Engine', 'Chatbot', 'Kundenservice', 'Gesundheit'],
        author: 'Dialog Engine',
        image: '',
        url: 'https://aok.dialogengine.de'
      }
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
      description: 'Standard Demo Template für die Dialog Engine',
      
      // Content
      content: {
        sections: [
          {
            type: 'hero',
            content: {
              title: 'Wir schalten Ihre Website in den Dialog-Modus',
              subtitle: 'Intelligent. Effizient. Zukunftssicher.',
              description: 'Websites sind und bleiben das Herzstück Ihrer digitalen Präsenz. Sie bieten Ihren Besuchern die Möglichkeit, Informationen zu suchen und zu entdecken.'
            }
          },
          {
            type: 'showcase',
            content: {
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
            }
          }
        ],
        metadata: {}
      },
      
      // Branding
      branding: {
        logo: '',
        colors: {
          primary: '#4F46E5',
          secondary: '#7C3AED',
          accent: '#6366F1'
        },
        fonts: {
          heading: 'Inter',
          body: 'Inter'
        }
      },
      
      // Config
      config: {
        smartSearch: {
          provider: 'openai',
          urls: [],
          excludePatterns: ['/admin/*', '/wp-*', '*.pdf', '/wp-json/*', '/api/*'],
          chunkSize: 500,
          temperature: 0.3,
          maxTokens: 1000
        }
      },
      
      // Handlers
      handlers: [],
      
      // Responses
      responses: {
        templates: [],
        rules: []
      },
      
      // Meta
      meta: {
        title: 'Dialog Engine Demo',
        description: 'Entdecken Sie die Zukunft der Website-Navigation mit der Dialog Engine.',
        keywords: ['Dialog Engine', 'KI', 'Content Management', 'Website Navigation'],
        author: 'Dialog Engine',
        image: '',
        url: 'https://default.dialogengine.de'
      }
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