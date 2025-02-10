'use client'

import { useEffect, useState } from 'react'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { Message } from '@/components/chat/types'

export default function TestResponsePage() {
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/test/response')
      .then(res => res.json())
      .then(data => {
        setResponse(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Fehler beim Laden der Test-Antwort:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="p-4">Lade Test-Antwort...</div>
  }

  if (!response) {
    return <div className="p-4">Keine Test-Antwort verfügbar.</div>
  }

  const message: Message = {
    role: 'assistant',
    content: response
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Test der Antwortdarstellung</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">Rohdaten der Antwort:</h2>
          <pre className="text-sm overflow-x-auto">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>

        <div className="border-t pt-4">
          <h2 className="font-semibold mb-2">Darstellung als MessageBubble:</h2>
          <MessageBubble
            message={message}
            branding={null}
          />
        </div>
      </div>
    </div>
  )
} 