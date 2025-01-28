import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Lösche alle vorhandenen Daten
  await prisma.template.deleteMany()
  await prisma.flowiseConfig.deleteMany()

  // Erstelle ein Standard-Template
  await prisma.template.create({
    data: {
      name: "Demo Template",
      type: "neutral",
      active: true,
      subdomain: "default",
      jsonContent: {
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
        callToAction: {
          title: "Testen Sie unser KI-System",
          description: "Erleben Sie die Zukunft des Content Managements",
          primaryButton: {
            text: "Demo starten",
            url: "#"
          }
        }
      },
      jsonBranding: {
        logo: "/showcase-default.png",
        primaryColor: "#4F46E5",
        secondaryColor: "#7C3AED"
      },
      jsonBot: {
        type: "examples",
        examples: [
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
      },
      jsonMeta: {
        title: "KI Content Management Demo",
        description: "Erleben Sie die Zukunft des Content Managements mit unserer KI-gestützten Lösung."
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