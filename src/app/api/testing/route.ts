import { NextResponse } from 'next/server';
import { MonitoringService } from '@/lib/monitoring/monitoring';
import { ABTestService } from '@/lib/services/testing/ABTestService';

// Singleton-Instanzen
let monitoring: MonitoringService | null = null;
let abTestService: ABTestService | null = null;

// Initialisierung der Services
function getServices() {
  try {
    if (!monitoring) {
      monitoring = new MonitoringService({
        serviceName: 'dialog-engine',
        serviceVersion: '1.0.0'
      });
      console.debug('MonitoringService initialisiert');
    }

    if (!abTestService) {
      abTestService = new ABTestService({ monitoring });
      console.debug('ABTestService initialisiert');
    }

    return { monitoring, abTestService };
  } catch (error) {
    console.error('Fehler bei der Service-Initialisierung:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const { abTestService } = getServices();
    const body = await request.json();

    console.debug('POST-Anfrage empfangen:', { action: body.action });

    if (!body.action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    switch (body.action) {
      case 'register': {
        const { testId, variants, metrics } = body;
        if (!testId || !variants || !metrics) {
          return NextResponse.json(
            { error: 'Missing required fields for test registration' },
            { status: 400 }
          );
        }

        // Validiere die Summe der Gewichte
        const totalWeight = variants.reduce(
          (sum: number, variant: { weight: number }) => sum + variant.weight,
          0
        );
        if (totalWeight !== 100) {
          return NextResponse.json(
            { error: 'Variant weights must sum to 100' },
            { status: 400 }
          );
        }

        console.debug('Registriere Test:', { testId, variants, metrics });
        abTestService.registerTest(testId, variants, metrics);
        return NextResponse.json(
          { success: true, message: 'Test registered' },
          { status: 200 }
        );
      }

      case 'select': {
        const { testId, userId } = body;
        if (!testId || !userId) {
          return NextResponse.json(
            { error: 'Missing required fields for variant selection' },
            { status: 400 }
          );
        }
        console.debug('Wähle Variante:', { testId, userId });
        const handler = abTestService.selectHandler(testId, userId);
        return NextResponse.json(
          { success: true, handlerType: handler.getType() },
          { status: 200 }
        );
      }

      case 'record': {
        const { testId, variantId, metrics } = body;
        if (!testId || !variantId || !metrics) {
          return NextResponse.json(
            { error: 'Missing required fields for recording metrics' },
            { status: 400 }
          );
        }
        console.debug('Zeichne Metriken auf:', { testId, variantId, metrics });
        abTestService.recordMetrics(testId, variantId, metrics);
        return NextResponse.json(
          { success: true, message: 'Metrics recorded' },
          { status: 200 }
        );
      }

      case 'results': {
        const { testId } = body;
        if (!testId) {
          return NextResponse.json(
            { error: 'Test ID is required' },
            { status: 400 }
          );
        }
        console.debug('Rufe Testergebnisse ab:', { testId });
        const results = abTestService.getTestResults(testId);
        return NextResponse.json(
          { success: true, results },
          { status: 200 }
        );
      }

      case 'end': {
        const { testId } = body;
        if (!testId) {
          return NextResponse.json(
            { error: 'Test ID is required' },
            { status: 400 }
          );
        }
        console.debug('Beende Test:', { testId });
        abTestService.endTest(testId);
        return NextResponse.json(
          { success: true, message: 'Test ended' },
          { status: 200 }
        );
      }

      default:
        console.debug('Ungültige Aktion:', body.action);
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Fehler in A/B-Test-API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { abTestService } = getServices();
    console.debug('Rufe aktive Tests und Metriken ab');
    const activeTests = abTestService.getActiveTests();
    const metrics = abTestService.getMetrics();

    return NextResponse.json(
      { success: true, activeTests, metrics },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fehler beim Abrufen der A/B-Test-Daten:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 