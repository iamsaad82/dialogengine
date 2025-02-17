import { describe, expect, it, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';

describe('A/B Testing API', () => {
  beforeEach(() => {
    // Reset module state before each test
    jest.resetModules();
  });

  const createRequest = (method: string, body?: any): Request => {
    return new Request('http://localhost:3000/api/testing', {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  it('sollte einen neuen A/B-Test registrieren', async () => {
    const { POST } = await import('@/app/api/testing/route');
    const req = createRequest('POST', {
      action: 'register',
      testId: 'button-test',
      variants: [
        { id: 'control', weight: 50 },
        { id: 'variant-a', weight: 50 }
      ],
      metrics: ['clicks', 'conversions']
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Test registered');
  });

  it('sollte eine Variante für einen Benutzer auswählen', async () => {
    const { POST } = await import('@/app/api/testing/route');

    // Erst Test registrieren
    const registerReq = createRequest('POST', {
      action: 'register',
      testId: 'button-test',
      variants: [
        { id: 'control', weight: 50 },
        { id: 'variant-a', weight: 50 }
      ],
      metrics: ['clicks', 'conversions']
    });
    await POST(registerReq);

    // Dann Variante auswählen
    const selectReq = createRequest('POST', {
      action: 'select',
      testId: 'button-test',
      userId: 'user-123'
    });

    const response = await POST(selectReq);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(['control', 'variant-a']).toContain(data.handlerType);
  });

  it('sollte Metriken für eine Testvariante aufzeichnen', async () => {
    const { POST } = await import('@/app/api/testing/route');

    // Test registrieren
    const registerReq = createRequest('POST', {
      action: 'register',
      testId: 'button-test',
      variants: [
        { id: 'control', weight: 50 },
        { id: 'variant-a', weight: 50 }
      ],
      metrics: ['clicks', 'conversions']
    });
    await POST(registerReq);

    // Metriken aufzeichnen
    const recordReq = createRequest('POST', {
      action: 'record',
      testId: 'button-test',
      variantId: 'control',
      metrics: {
        clicks: 1,
        conversions: 1
      }
    });

    const response = await POST(recordReq);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Metrics recorded');
  });

  it('sollte aktive Tests und Metriken abrufen', async () => {
    const { POST, GET } = await import('@/app/api/testing/route');

    // Test registrieren und Metriken aufzeichnen
    const registerReq = createRequest('POST', {
      action: 'register',
      testId: 'button-test',
      variants: [
        { id: 'control', weight: 50 },
        { id: 'variant-a', weight: 50 }
      ],
      metrics: ['clicks', 'conversions']
    });
    await POST(registerReq);

    const recordReq = createRequest('POST', {
      action: 'record',
      testId: 'button-test',
      variantId: 'control',
      metrics: {
        clicks: 1,
        conversions: 1
      }
    });
    await POST(recordReq);

    // GET-Anfrage für Tests und Metriken
    const getReq = createRequest('GET');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.activeTests).toBeDefined();
    expect(data.metrics).toBeDefined();
  });

  it('sollte einen Test beenden können', async () => {
    const { POST } = await import('@/app/api/testing/route');

    // Test registrieren
    const registerReq = createRequest('POST', {
      action: 'register',
      testId: 'button-test',
      variants: [
        { id: 'control', weight: 50 },
        { id: 'variant-a', weight: 50 }
      ],
      metrics: ['clicks', 'conversions']
    });
    await POST(registerReq);

    // Test beenden
    const endReq = createRequest('POST', {
      action: 'end',
      testId: 'button-test'
    });

    const response = await POST(endReq);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Test ended');
  });

  it('sollte bei ungültiger Aktion einen Fehler zurückgeben', async () => {
    const { POST } = await import('@/app/api/testing/route');
    const req = createRequest('POST', {
      action: 'invalid-action'
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid action');
  });

  describe('Fehlerszenarien', () => {
    it('sollte einen Fehler zurückgeben, wenn die Gewichte nicht 100 ergeben', async () => {
      const { POST } = await import('@/app/api/testing/route');
      const req = createRequest('POST', {
        action: 'register',
        testId: 'invalid-weights-test',
        variants: [
          { id: 'control', weight: 40 },
          { id: 'variant-a', weight: 40 }
        ],
        metrics: ['clicks']
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Variant weights must sum to 100');
    });

    it('sollte einen Fehler zurückgeben bei nicht existierendem Test', async () => {
      const { POST } = await import('@/app/api/testing/route');
      const req = createRequest('POST', {
        action: 'select',
        testId: 'non-existent-test',
        userId: 'user-123'
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('not found');
    });

    it('sollte einen Fehler zurückgeben bei fehlenden Pflichtfeldern', async () => {
      const { POST } = await import('@/app/api/testing/route');
      const req = createRequest('POST', {
        action: 'register',
        testId: 'missing-fields-test'
        // variants und metrics fehlen
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });
  });

  describe('Edge Cases', () => {
    it('sollte mit einer einzelnen Variante umgehen können', async () => {
      const { POST } = await import('@/app/api/testing/route');
      const req = createRequest('POST', {
        action: 'register',
        testId: 'single-variant-test',
        variants: [
          { id: 'control', weight: 100 }
        ],
        metrics: ['clicks']
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('sollte mit vielen Varianten umgehen können', async () => {
      const { POST } = await import('@/app/api/testing/route');
      const variants = Array.from({ length: 10 }, (_, i) => ({
        id: `variant-${i}`,
        weight: 10 // 10 Varianten mit je 10% = 100%
      }));

      const req = createRequest('POST', {
        action: 'register',
        testId: 'many-variants-test',
        variants,
        metrics: ['clicks']
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Konsistenz-Tests', () => {
    it('sollte konsistent die gleiche Variante für den gleichen Benutzer zurückgeben', async () => {
      const { POST } = await import('@/app/api/testing/route');
      
      // Test registrieren
      await POST(createRequest('POST', {
        action: 'register',
        testId: 'consistency-test',
        variants: [
          { id: 'control', weight: 50 },
          { id: 'variant-a', weight: 50 }
        ],
        metrics: ['clicks']
      }));

      // Mehrmals die gleiche Variante für den gleichen Benutzer abrufen
      const userId = 'consistent-user-123';
      const selections = await Promise.all(
        Array.from({ length: 5 }, () => 
          POST(createRequest('POST', {
            action: 'select',
            testId: 'consistency-test',
            userId
          }))
        )
      );

      const results = await Promise.all(
        selections.map(response => response.json())
      );

      // Alle Ergebnisse sollten die gleiche Variante zurückgeben
      const firstVariant = results[0].handlerType;
      results.forEach(result => {
        expect(result.handlerType).toBe(firstVariant);
      });
    });

    it('sollte Metriken kumulativ aufzeichnen', async () => {
      const { POST } = await import('@/app/api/testing/route');
      
      // Test registrieren
      await POST(createRequest('POST', {
        action: 'register',
        testId: 'cumulative-test',
        variants: [
          { id: 'control', weight: 100 }
        ],
        metrics: ['clicks']
      }));

      // Mehrere Metriken aufzeichnen
      for (let i = 0; i < 3; i++) {
        await POST(createRequest('POST', {
          action: 'record',
          testId: 'cumulative-test',
          variantId: 'control',
          metrics: { clicks: 1 }
        }));
      }

      // Ergebnisse abrufen
      const resultsReq = createRequest('POST', {
        action: 'results',
        testId: 'cumulative-test'
      });
      const response = await POST(resultsReq);
      const data = await response.json();

      const controlResult = data.results.find(
        (r: any) => r.variant === 'control'
      );
      expect(controlResult.sampleSize).toBe(3);
      expect(controlResult.metrics.clicks).toBeGreaterThan(0);
    });
  });
}); 