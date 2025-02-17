import { NextResponse } from 'next/server'
import { MonitoringService } from '../../../lib/monitoring/monitoring'

// Singleton-Instanz des Server-Monitorings
let monitoring: MonitoringService | null = null

function getMonitoring() {
  if (!monitoring) {
    monitoring = new MonitoringService({
      serviceName: 'dialog-engine',
      serviceVersion: '1.0.0'
    })
  }
  return monitoring
}

export async function POST(request: Request) {
  try {
    const { events } = await request.json()
    
    if (!Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Ungültiges Event-Format' },
        { status: 400 }
      )
    }

    const monitoring = getMonitoring()

    // Events verarbeiten
    for (const event of events) {
      switch (event.type) {
        case 'call':
          monitoring.recordHandlerCall(event.handler, event.success || false)
          break
          
        case 'latency':
          monitoring.recordHandlerLatency(event.handler, event.duration || 0)
          break
          
        case 'abtest':
          monitoring.recordABTestMetrics(
            event.testId || '',
            event.variantId || '',
            event.metrics || {}
          )
          break
          
        default:
          console.warn('Unbekannter Event-Typ:', event.type)
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `${events.length} Events verarbeitet`
    })
  } catch (error) {
    console.error('Fehler beim Verarbeiten der Events:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const monitoring = getMonitoring()
    const metrics = await monitoring.getMetrics()
    
    return new NextResponse(metrics, {
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'
      }
    })
  } catch (error) {
    console.error('Fehler beim Abrufen der Metriken:', error)
    return NextResponse.json(
      { error: 'Interner Server-Fehler' },
      { status: 500 }
    )
  }
} 