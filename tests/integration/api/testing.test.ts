import { describe, expect, it, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { GET, POST } from '@/app/api/testing/route';

describe('A/B Testing API', () => {
  beforeEach(() => {
    // Reset module state before each test
    jest.resetModules();
  });

  it('sollte einen neuen A/B-Test registrieren', async () => {
    const { req } = createMocks({
      method: 'POST',
      body: {
        action: 'register',
        testId: 'button-test',
        variants: [
          { id: 'control', weight: 0.5 },
          { id: 'variant-a', weight: 0.5 }
        ],
        metrics: ['clicks', 'conversions']
      }
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Test registered');
  });

  it('sollte eine Variante für einen Benutzer auswählen', async () => {
    // Erst Test registrieren
    const { req: registerReq } = createMocks({
      method: 'POST',
      body: {
        action: 'register',
        testId: 'button-test',
        variants: [
          { id: 'control', weight: 0.5 },
          { id: 'variant-a', weight: 0.5 }
        ],
        metrics: ['clicks', 'conversions']
      }
    });
    await POST(registerReq);

    // Dann Variante auswählen
    const { req: selectReq } = createMocks({
      method: 'POST',
      body: {
        action: 'select',
        testId: 'button-test',
        userId: 'user-123'
      }
    });

    const response = await POST(selectReq);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(['control', 'variant-a']).toContain(data.handlerType);
  });

  it('sollte Metriken für eine Testvariante aufzeichnen', async () => {
    // Test registrieren
    const { req: registerReq } = createMocks({
      method: 'POST',
      body: {
        action: 'register',
        testId: 'button-test',
        variants: [
          { id: 'control', weight: 0.5 },
          { id: 'variant-a', weight: 0.5 }
        ],
        metrics: ['clicks', 'conversions']
      }
    });
    await POST(registerReq);

    // Metriken aufzeichnen
    const { req: recordReq } = createMocks({
      method: 'POST',
      body: {
        action: 'record',
        testId: 'button-test',
        variantId: 'control',
        metrics: {
          clicks: 1,
          conversions: 1
        }
      }
    });

    const response = await POST(recordReq);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Metrics recorded');
  });

  it('sollte aktive Tests und Metriken abrufen', async () => {
    // Test registrieren und Metriken aufzeichnen
    const { req: registerReq } = createMocks({
      method: 'POST',
      body: {
        action: 'register',
        testId: 'button-test',
        variants: [
          { id: 'control', weight: 0.5 },
          { id: 'variant-a', weight: 0.5 }
        ],
        metrics: ['clicks', 'conversions']
      }
    });
    await POST(registerReq);

    const { req: recordReq } = createMocks({
      method: 'POST',
      body: {
        action: 'record',
        testId: 'button-test',
        variantId: 'control',
        metrics: {
          clicks: 1,
          conversions: 1
        }
      }
    });
    await POST(recordReq);

    // GET-Anfrage für Tests und Metriken
    const { req: getReq } = createMocks({ method: 'GET' });
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.activeTests).toBeDefined();
    expect(data.metrics).toBeDefined();
  });

  it('sollte einen Test beenden können', async () => {
    // Test registrieren
    const { req: registerReq } = createMocks({
      method: 'POST',
      body: {
        action: 'register',
        testId: 'button-test',
        variants: [
          { id: 'control', weight: 0.5 },
          { id: 'variant-a', weight: 0.5 }
        ],
        metrics: ['clicks', 'conversions']
      }
    });
    await POST(registerReq);

    // Test beenden
    const { req: endReq } = createMocks({
      method: 'POST',
      body: {
        action: 'end',
        testId: 'button-test'
      }
    });

    const response = await POST(endReq);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Test ended');
  });

  it('sollte bei ungültiger Aktion einen Fehler zurückgeben', async () => {
    const { req } = createMocks({
      method: 'POST',
      body: {
        action: 'invalid-action'
      }
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid action');
  });
}); 