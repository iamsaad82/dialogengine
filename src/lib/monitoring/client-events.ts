interface HandlerEvent {
  handler: string
  type: 'call' | 'latency' | 'abtest'
  success?: boolean
  duration?: number
  timestamp: number
  testId?: string
  variantId?: string
  metrics?: Record<string, number>
}

class EventCollector {
  private events: HandlerEvent[] = []

  recordCall(handler: string, success: boolean) {
    this.events.push({
      handler,
      type: 'call',
      success,
      timestamp: Date.now()
    })
    this.sendEvents()
  }

  recordLatency(handler: string, duration: number) {
    this.events.push({
      handler,
      type: 'latency',
      duration,
      timestamp: Date.now()
    })
    this.sendEvents()
  }

  recordABTestMetrics(testId: string, variantId: string, metrics: Record<string, number>) {
    this.events.push({
      handler: 'ABTest',
      type: 'abtest',
      testId,
      variantId,
      metrics,
      timestamp: Date.now()
    })
    this.sendEvents()
  }

  private async sendEvents() {
    if (this.events.length === 0) return

    try {
      const response = await fetch('/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          events: this.events
        })
      })

      if (response.ok) {
        this.events = []
        console.debug('Events erfolgreich gesendet')
      }
    } catch (error) {
      console.error('Fehler beim Senden der Events:', error)
    }
  }
}

// Singleton-Instanz
export const eventCollector = new EventCollector() 