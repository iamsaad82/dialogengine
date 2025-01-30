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

  // Erstelle ein Standard-Template
  await prisma.template.create({
    data: {
      name: "Demo Template",
      type: "neutral",
      active: true,
      subdomain: "default",
      jsonContent: JSON.stringify({
        hero: {
          title: "Content Management mit KI",
          subtitle: "Intelligent. Effizient. Zukunftssicher.",
          description: "Unser KI-gestütztes Content Management System revolutioniert die Art und Weise, wie Sie Inhalte erstellen und verwalten."
        },
        showcase: {
          image: "/showcase-default.png",
          altText: "KI Content Management Demo",
          context: {
            title: "Intelligente Inhaltsanalyse",
            description: "Unsere KI analysiert Ihre Inhalte und gibt Ihnen wertvolle Einblicke zur Optimierung."
          }
        },
        features: [
          {
            title: "KI-gestützte Analyse",
            description: "Automatische Analyse und Kategorisierung Ihrer Inhalte",
            icon: "BrainCircuit"
          },
          {
            title: "Intelligente Vorschläge",
            description: "Erhalten Sie KI-basierte Vorschläge zur Verbesserung Ihrer Inhalte",
            icon: "Lightbulb"
          },
          {
            title: "Echtzeit-Collaboration",
            description: "Arbeiten Sie in Echtzeit mit Ihrem Team an Inhalten",
            icon: "Users"
          }
        ],
        contact: {
          title: "Sprechen Sie mit uns",
          description: "Sie möchten mehr über die Dialog Engine erfahren? Unser Team berät Sie gerne zu den Möglichkeiten für Ihre Website.",
          email: "contact@example.com",
          buttonText: "Beratungsgespräch vereinbaren"
        },
        dialog: {
          title: "Haben Sie Fragen?",
          description: "Stellen Sie uns Ihre Fragen - unser KI-System hilft Ihnen gerne weiter."
        },
        callToAction: {
          title: "Testen Sie unser KI-System",
          description: "Erleben Sie die Zukunft des Content Managements",
          primaryButton: {
            text: "Demo starten",
            url: "#"
          }
        }
      }),
      jsonBranding: JSON.stringify({
        logo: "/showcase-default.png",
        primaryColor: "#4F46E5",
        secondaryColor: "#7C3AED"
      }),
      jsonBot: JSON.stringify({
        type: "examples",
        examples: [
          {
            question: "Welche Kurse bietet die AOK an?",
            answer: "Wir bieten verschiedene Gesundheitskurse an. Hier ist ein aktueller Kurs in Ihrer Nähe:",
            type: "event",
            context: "Kurse",
            metadata: {
              title: "Functional Training",
              address: "2,12 km | 44869 Bochum",
              date: "2025-04-30",
              time: "18:00 - 19:00 Uhr",
              sessions: "8 Termine",
              available: true,
              buttonText: "Jetzt anmelden",
              url: "https://www.aok.de/pk/nordwest/kurse/"
            }
          },
          {
            question: "Was kann Ihr Content Management System?",
            answer: "Unser KI-gestütztes CMS bietet:\n• Automatische Inhaltsanalyse\n• KI-basierte Optimierungsvorschläge\n• Echtzeit-Collaboration\n• Intelligente Kategorisierung\n• Automatische SEO-Optimierung",
            type: "info",
            context: ""
          },
          {
            question: "Wie funktioniert die KI-Analyse?",
            answer: "Die KI-Analyse läuft in mehreren Schritten ab:\n• Scanning Ihrer bestehenden Inhalte\n• Analyse von Struktur und Qualität\n• Erstellung von Optimierungsvorschlägen\n• Kontinuierliches Lernen aus Feedback",
            type: "info",
            context: ""
          }
        ],
        flowiseId: ""
      }),
      jsonMeta: JSON.stringify({
        title: "KI Content Management Demo",
        description: "Erleben Sie die Zukunft des Content Managements mit unserer KI-gestützten Lösung."
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