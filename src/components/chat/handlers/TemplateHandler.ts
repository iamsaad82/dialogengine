import { Template, ParsedBot, ParsedBranding } from '@/lib/types/template'
import { Message } from '../types'

type LogFunction = (
  question: string,
  wasAnswered: boolean,
  answer?: string,
  matchedExampleId?: string
) => Promise<void>

export async function handleTemplateMode(
  message: string,
  history: Message[],
  template: Template,
  bot: ParsedBot,
  branding: ParsedBranding | null,
  logChat: LogFunction
): Promise<Message> {
  try {
    const response = await fetch('/api/chat/template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        history,
        templateId: template.id,
        handlers: template.handlers
      })
    })

    if (!response.ok) {
      throw new Error('Fehler bei der Verarbeitung der Anfrage')
    }

    const data = await response.json()
    
    // Log the interaction
    await logChat(
      message,
      true,
      data.content,
      data.metadata?.matchedHandlerId
    )

    return {
      role: 'assistant',
      content: JSON.stringify({
        type: 'success',
        text: data.content,
        metadata: {
          ...data.metadata,
          color: branding?.primaryColor || 'var(--primary)'
        }
      })
    }
  } catch (error) {
    console.error('Template handler error:', error)
    
    // Log the failed interaction
    await logChat(message, false)

    return {
      role: 'assistant',
      content: JSON.stringify({
        type: 'error',
        title: 'Fehler',
        text: 'Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuchen Sie es später noch einmal.',
        metadata: {
          color: branding?.primaryColor || 'var(--primary)'
        }
      })
    }
  }
} 