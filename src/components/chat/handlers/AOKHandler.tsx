import { Template, ParsedBot, ParsedBranding } from '@/lib/types/template'
import { Message } from '../types'

export async function handleAOKMode(
  userMessage: string,
  messages: Message[],
  template: Template,
  bot: ParsedBot | null,
  branding: ParsedBranding | null,
  logChatInteraction: (question: string, wasAnswered: boolean, answer?: string, matchedExampleId?: string) => Promise<void>
): Promise<Message> {
  const startTime = performance.now()
  console.log('AOKHandler - Starte Verarbeitung:', {
    message: userMessage,
    templateId: template.id,
    historyLength: messages.length
  })

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: userMessage,
        templateId: template.id,
        sessionId: Math.random().toString(36).substring(7),
        history: messages.map(msg => ({
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : 'Complex content'
        }))
      })
    })

    if (!response.ok) {
      throw new Error('Netzwerk-Antwort war nicht ok')
    }

    const data = await response.json()
    const endTime = performance.now()
    const duration = Math.round(endTime - startTime)

    console.log('AOKHandler - Antwort erhalten:', {
      duration: `${duration}ms`,
      type: data.type,
      hasMetadata: !!data.metadata,
      sources: data.metadata?.sources,
      pineconeIndex: data.metadata?.pineconeIndex,
      confidence: data.metadata?.confidence,
      processingDetails: {
        vectorSearchTime: data.metadata?.vectorSearchTime,
        totalTokens: data.metadata?.totalTokens,
        promptTokens: data.metadata?.promptTokens,
        completionTokens: data.metadata?.completionTokens
      }
    })
    
    await new Promise(resolve => setTimeout(resolve, 800))
    
    if (data.text || data.answer) {
      await logChatInteraction(userMessage, true, data.text || data.answer, 'aok-handler')
      
      return {
        role: 'assistant',
        content: JSON.stringify({
          type: data.type || 'info',
          text: data.text || data.answer,
          metadata: {
            ...data.metadata,
            color: branding?.primaryColor || 'var(--primary)',
            processingTime: duration
          }
        })
      }
    } else {
      return {
        role: 'assistant',
        content: JSON.stringify({
          type: 'info',
          title: 'Keine Antwort',
          text: 'Entschuldigung, ich konnte Ihre Frage nicht verstehen. Bitte formulieren Sie sie anders.',
          metadata: {
            color: branding?.primaryColor || 'var(--primary)',
            processingTime: duration
          }
        })
      }
    }
  } catch (error) {
    console.error('AOKHandler error:', error)
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