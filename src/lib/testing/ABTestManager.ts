import { BaseHandler } from '../handlers/BaseHandler';
import { eventCollector } from '../monitoring/client-events';

interface ABTestConfig {
  testId: string;
  variants: {
    [key: string]: {
      handler: BaseHandler;
      weight: number;  // Prozentsatz für Traffic-Verteilung
    };
  };
  metrics: string[];  // Zu überwachende Metriken
}

interface ABTestResult {
  variant: string;
  metrics: {
    [key: string]: number;
  };
  sampleSize: number;
}

export class ABTestManager {
  private tests: Map<string, ABTestConfig> = new Map();
  private results: Map<string, Map<string, ABTestResult>> = new Map();

  /**
   * Registriert einen neuen A/B-Test
   */
  registerTest(config: ABTestConfig): void {
    // Validiere Gewichtungen
    const totalWeight = Object.values(config.variants)
      .reduce((sum, variant) => sum + variant.weight, 0);
    
    if (totalWeight !== 100) {
      throw new Error('Variant weights must sum to 100');
    }

    this.tests.set(config.testId, config);
    
    // Initialisiere Ergebnisse für alle Varianten
    const variantResults = new Map<string, ABTestResult>();
    Object.keys(config.variants).forEach(variantId => {
      variantResults.set(variantId, {
        variant: variantId,
        metrics: {},
        sampleSize: 0
      });
    });
    this.results.set(config.testId, variantResults);
  }

  /**
   * Wählt eine Variante für eine Anfrage aus
   */
  selectVariant(testId: string, userId: string): BaseHandler {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test ${testId} not found`);
    }

    // Deterministisch basierend auf userId und testId
    const hash = this.hashString(`${userId}-${testId}`);
    const percentage = hash % 100;

    let currentSum = 0;
    for (const [variantId, variant] of Object.entries(test.variants)) {
      currentSum += variant.weight;
      if (percentage < currentSum) {
        return variant.handler;
      }
    }

    // Fallback zur ersten Variante
    return Object.values(test.variants)[0].handler;
  }

  /**
   * Zeichnet Metriken für eine Variante auf
   */
  recordMetrics(testId: string, variantId: string, metrics: Record<string, number>): void {
    const testResults = this.results.get(testId);
    if (!testResults) {
      throw new Error(`Test ${testId} not found`);
    }

    let variantResults = testResults.get(variantId);
    if (!variantResults) {
      // Initialisiere neue Varianten-Ergebnisse
      variantResults = {
        variant: variantId,
        metrics: {},
        sampleSize: 0
      };
      testResults.set(variantId, variantResults);
    }

    // Aktualisiere Metriken
    Object.entries(metrics).forEach(([metric, value]) => {
      const currentValue = variantResults!.metrics[metric] || 0;
      const currentSize = variantResults!.sampleSize;
      
      // Berechne gewichteten Durchschnitt
      variantResults!.metrics[metric] = 
        (currentValue * currentSize + value) / (currentSize + 1);
    });

    variantResults.sampleSize++;

    // Aktualisiere die Ergebnisse in der Map
    testResults.set(variantId, variantResults);
    this.results.set(testId, testResults);

    // Zeichne für Monitoring auf
    eventCollector.recordABTestMetrics(testId, variantId, metrics);
  }

  /**
   * Ruft die Ergebnisse eines Tests ab
   */
  getTestResults(testId: string): ABTestResult[] {
    const testResults = this.results.get(testId);
    if (!testResults) {
      throw new Error(`Test ${testId} not found`);
    }

    return Array.from(testResults.values());
  }

  /**
   * Hilfsfunktion für deterministische Hash-Generierung
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
} 