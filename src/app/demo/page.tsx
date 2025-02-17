'use client'

import { useEffect, useState } from 'react'
import { ClientMonitoringService } from '../../lib/monitoring/client-monitoring'

export default function DemoPage() {
  const [serverMetrics, setServerMetrics] = useState<string>('')
  const [lastUpdate, setLastUpdate] = useState<string>('')

  useEffect(() => {
    // Client-Monitoring initialisieren
    const monitoring = new ClientMonitoringService({
      serviceName: 'demo-service',
      serviceVersion: '1.0.0'
    })

    // Test-Metriken aufzeichnen
    try {
      console.log('Starte Metrik-Aufzeichnung...')

      // Handler-Nutzung simulieren
      monitoring.recordHandlerUsage('test-handler', 'success')
      console.log('Handler-Metrik aufgezeichnet')
      
      // Such-Anfrage simulieren
      monitoring.recordSearchRequest('success', 'test-handler')
      console.log('Such-Metrik aufgezeichnet')
      
      // Fehler simulieren
      monitoring.recordError('test-error', '404')
      console.log('Fehler-Metrik aufgezeichnet')
      
      // Cache-Hit simulieren
      monitoring.updateCacheHitRatio(0.75, 'local')
      console.log('Cache-Metrik aufgezeichnet')
      
      // Latenz simulieren
      monitoring.recordSearchLatency(0.123, 'test-handler')
      console.log('Latenz-Metrik aufgezeichnet')

      console.log('Alle Metriken erfolgreich aufgezeichnet')

      // Server-Metriken regelmäßig abrufen
      const fetchServerMetrics = async () => {
        try {
          const response = await fetch('/api/metrics')
          if (response.ok) {
            const metrics = await response.text()
            setServerMetrics(metrics)
            setLastUpdate(new Date().toLocaleTimeString())
          }
        } catch (error) {
          console.error('Fehler beim Abrufen der Server-Metriken:', error)
        }
      }

      // Initial und dann alle 10 Sekunden aktualisieren
      fetchServerMetrics()
      const interval = setInterval(fetchServerMetrics, 10000)

      return () => {
        clearInterval(interval)
      }
    } catch (error) {
      console.error('Fehler beim Aufzeichnen der Metriken:', error)
    }
  }, [])

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Monitoring Demo</h1>
      <div className="mb-4">
        <p>Client-Metriken werden in der Konsole angezeigt.</p>
        <p>Server-Metriken werden alle 10 Sekunden aktualisiert.</p>
        {lastUpdate && (
          <p className="text-sm text-gray-600">
            Letzte Aktualisierung: {lastUpdate}
          </p>
        )}
      </div>
      
      {serverMetrics && (
        <div className="mt-4">
          <h2 className="text-xl font-bold mb-2">Server Metriken:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            {serverMetrics}
          </pre>
        </div>
      )}
    </div>
  )
} 