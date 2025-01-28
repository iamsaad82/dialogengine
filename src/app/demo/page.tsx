'use client'

import TemplateEditor from '@/components/admin/TemplateEditor'
import { Template } from '@/lib/schemas/template'

const now = new Date()

const demoTemplate: Omit<Template, 'createdAt' | 'updatedAt'> & {
  createdAt: string | Date
  updatedAt: string | Date
} = {
  id: 'demo-1',
  name: 'Demo Template',
  type: 'NEUTRAL' as const,
  active: true,
  subdomain: 'demo',
  jsonContent: JSON.stringify({
    hero: {
      title: 'Willkommen zur Demo',
      subtitle: 'Testen Sie unseren KI-Chatbot',
      description: 'Eine leistungsstarke Lösung für Ihre Website'
    },
    dialog: {
      title: 'Wie kann ich helfen?',
      description: 'Ich beantworte gerne Ihre Fragen'
    }
  }),
  jsonBranding: JSON.stringify({
    logo: '/demo-logo.png',
    primaryColor: '#4F46E5',
    secondaryColor: '#7C3AED'
  }),
  jsonBot: JSON.stringify({
    type: 'examples',
    examples: [
      {
        question: 'Was sind die Öffnungszeiten?',
        answer: 'Wir sind Montag bis Freitag von 9:00 bis 18:00 Uhr für Sie da.',
        context: 'Öffnungszeiten',
        type: 'info'
      }
    ]
  }),
  jsonMeta: JSON.stringify({
    title: 'Demo Template',
    description: 'Eine Demo-Version unseres KI-Chatbots'
  }),
  createdAt: now,
  updatedAt: now
}

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-8">Dialog Engine Demo</h1>
        <TemplateEditor 
          template={demoTemplate as Template}
          onSave={async () => {
            console.log('Demo: Speichern wurde geklickt')
          }}
          onCancel={() => {
            console.log('Demo: Abbrechen wurde geklickt')
          }}
        />
      </div>
    </div>
  )
} 