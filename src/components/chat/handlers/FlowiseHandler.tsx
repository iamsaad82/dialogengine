import { Template, ParsedBot } from '@/lib/types/template'
import { Message } from '../types'

export async function handleFlowiseMode(
  userMessage: string,
  messages: Message[],
  template: Template,
  bot: ParsedBot | null,
  branding: any,
  logChatInteraction: (question: string, wasAnswered: boolean, answer?: string, matchedExampleId?: string) => Promise<void>
): Promise<Message> {
  if (!bot?.flowiseId) {
    return {
      role: 'assistant',
      content: JSON.stringify({
        type: 'error',
        title: 'Konfigurationsfehler',
        text: 'Der Flowise-Bot wurde noch nicht vollständig konfiguriert. Bitte fügen Sie eine Flowise-ID in den Bot-Einstellungen hinzu.',
        metadata: {
          color: branding?.primaryColor || 'var(--primary)'
        }
      })
    }
  }

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        question: userMessage,
        history: messages.map(msg => ({
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : 'Complex content'
        })),
        flowiseId: bot.flowiseId,
        templateId: template.id
      })
    })

    if (!response.ok) {
      throw new Error('Netzwerk-Antwort war nicht ok')
    }

    const data = await response.json()
    await new Promise(resolve => setTimeout(resolve, 800))
    
    if (data.text || data.answer) {
      await logChatInteraction(userMessage, true, data.text || data.answer, 'flowise')
      
      return {
        role: 'assistant',
        content: JSON.stringify({
          type: data.type || 'info',
          text: data.text || data.answer,
          metadata: data.metadata || {}
        })
      }
    } else {
      return {
        role: 'assistant',
        content: JSON.stringify({
          type: 'info',
          title: 'Keine Antwort',
          text: 'Entschuldigung, ich konnte Ihre Frage nicht verstehen. Bitte formulieren Sie sie anders.'
        })
      }
    }
  } catch (error) {
    console.error('Flowise error:', error)
    return {
      role: 'assistant',
      content: JSON.stringify({
        type: 'error',
        title: 'Technischer Fehler',
        text: 'Es tut mir leid, es ist ein Fehler aufgetreten. Bitte versuchen Sie es später noch einmal.',
        metadata: {
          color: branding?.primaryColor || 'var(--primary)'
        }
      })
    }
  }
} 