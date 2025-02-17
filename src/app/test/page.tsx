'use client'

import { useEffect, useState } from 'react'
import { TestHandler } from '../../lib/handlers/TestHandler'

export default function TestPage() {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testHandler = new TestHandler()

  const runTest = async (query: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await testHandler.handleSearch(query)
      setResults(prev => [...prev, { query, response }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Automatische Tests ausführen
    const runTests = async () => {
      await runTest('fast test')
      await runTest('slow test')
      await runTest('error test')
      await runTest('normal test')
    }
    runTests()
  }, [])

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Handler Test</h1>
      
      {loading && (
        <div className="mb-4 text-blue-600">
          Test läuft...
        </div>
      )}

      {error && (
        <div className="mb-4 text-red-600">
          Fehler: {error}
        </div>
      )}

      <div className="space-y-4">
        {results.map((result, index) => (
          <div key={index} className="border p-4 rounded">
            <div className="font-bold">Query: {result.query}</div>
            <pre className="mt-2 bg-gray-100 p-2 rounded">
              {JSON.stringify(result.response, null, 2)}
            </pre>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-2">Metriken</h2>
        <p>Überprüfen Sie /api/metrics für die Prometheus-Metriken</p>
      </div>
    </div>
  )
} 