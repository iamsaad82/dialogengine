import { Template } from '@/lib/types/template'
import { Message } from '../types'

interface ChatMessage {
  role: string
  content: string | {
    text: string
    [key: string]: any
  }
}

export async function handleSmartSearchMode(
  userMessage: string,
  messages: Message[],
  template: Template,
  logChatInteraction: (message: string, success: boolean, response?: string, source?: string) => Promise<void>
): Promise<Message> {
  const startTime = performance.now()
  console.log('Smart Search Mode - Start', {
    templateId: template.id,
    messageCount: messages.length,
    userMessage
  })
  
  try {
    const chatHistory = messages.map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string' 
        ? msg.content 
        : typeof msg.content === 'object' && msg.content !== null
          ? JSON.parse(typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)).text
          : ''
    }))

    console.log('Aufbereiteter Chat-Verlauf:', {
      historyLength: chatHistory.length,
      lastMessage: chatHistory[chatHistory.length - 1]?.content
    })

    const response = await fetch(`/api/templates/${template.id}/smart-search/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        query: userMessage,
        history: chatHistory
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Smart Search API Fehler:', {
        status: response.status,
        error: errorData
      })
      throw new Error(errorData.error || 'Fehler bei der Smart Search Anfrage')
    }

    const data = await response.json()
    const endTime = performance.now()
    const duration = Math.round(endTime - startTime)
    
    console.log('Smart Search Antwort erhalten:', {
      type: data.type,
      hasMetadata: !!data.metadata,
      duration,
      responseLength: data.text.length
    })
    
    await logChatInteraction(userMessage, true, data.text, 'smart-search')
    return {
      role: 'assistant',
      content: JSON.stringify({
        type: data.type || 'info',
        text: data.text,
        metadata: {
          ...data.metadata,
          sources: data.sources,
          processingTime: duration
        }
      })
    }
  } catch (error) {
    const endTime = performance.now()
    console.error('Smart Search Fehler:', {
      error,
      duration: Math.round(endTime - startTime)
    })
    
    await logChatInteraction(userMessage, false)
    return {
      role: 'assistant',
      content: JSON.stringify({
        type: 'error',
        text: error instanceof Error ? error.message : 'Ein technischer Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
      })
    }
  }
} 