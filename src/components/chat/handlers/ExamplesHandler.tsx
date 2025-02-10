import { Example, ParsedBot } from '@/lib/types/template'
import { Message } from '../types'

export async function handleExamplesMode(
  userMessage: string,
  bot: ParsedBot | null,
  logChatInteraction: (question: string, wasAnswered: boolean, answer?: string, matchedExampleId?: string) => Promise<void>
): Promise<Message> {
  const findDemoAnswer = (question: string): Example | undefined => {
    if (!bot?.examples) {
      return undefined
    }
    
    // Exakte Übereinstimmung
    const exactMatch = bot.examples.find(
      (ex: Example) => ex.question.toLowerCase() === question.toLowerCase()
    )
    if (exactMatch) {
      return exactMatch
    }

    // Teilweise Übereinstimmung
    return bot.examples.find(
      (ex: Example) => question.toLowerCase().includes(ex.question.toLowerCase()) ||
           ex.question.toLowerCase().includes(question.toLowerCase())
    )
  }

  await new Promise(resolve => setTimeout(resolve, 1000))
  const example = findDemoAnswer(userMessage)

  if (example) {
    await logChatInteraction(userMessage, true, example.answer, example.id)
    return {
      role: 'assistant',
      content: JSON.stringify({
        type: example.type || 'info',
        title: example.title,
        text: example.answer,
        metadata: example.metadata
      })
    }
  } else {
    await logChatInteraction(userMessage, false)
    
    const availableExamples = bot?.examples
      ?.slice(0, 3)
      ?.map((ex: Example) => `• ${ex.question}`)
      ?.join('\n') || 'Keine Beispielfragen verfügbar'

    return {
      role: 'assistant',
      content: JSON.stringify({
        type: 'info',
        title: 'Keine passende Antwort gefunden',
        text: `Entschuldigung, für diese spezifische Frage habe ich leider keine passende Antwort. 

Ich kann Ihnen aber bei folgenden Themen weiterhelfen:

${availableExamples}

Sie können auch den klassischen Modus nutzen, um alle Inhalte der Website zu durchsuchen.`
      })
    }
  }
} 