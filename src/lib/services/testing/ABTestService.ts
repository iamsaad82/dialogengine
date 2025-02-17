import { ABTestManager } from '../../testing/ABTestManager';
import { MonitoringService } from '../../monitoring/monitoring';
import { BaseHandler } from '../../handlers/BaseHandler';
import { HandlerConfig } from '../../types/HandlerConfig';

export interface ABTestServiceConfig {
  monitoring: MonitoringService;
}

export class ABTestService {
  private readonly manager: ABTestManager;
  private readonly monitoring: MonitoringService;

  constructor(config: ABTestServiceConfig) {
    this.manager = new ABTestManager();
    this.monitoring = config.monitoring;
  }

  /**
   * Registriert einen neuen A/B-Test
   */
  public registerTest(
    testId: string,
    variants: { id: string; weight: number }[],
    metrics: string[]
  ): void {
    const variantMap: Record<string, { handler: BaseHandler; weight: number }> = {};
    variants.forEach(variant => {
      const config: HandlerConfig = {
        type: variant.id,
        searchFields: [],
        responseTemplate: '',
        validationRules: {
          type: variant.id,
          required: [],
          validation: {}
        }
      };
      variantMap[variant.id] = {
        handler: new BaseHandler(config),
        weight: variant.weight
      };
    });

    this.manager.registerTest({
      testId,
      variants: variantMap,
      metrics
    });
  }

  /**
   * Wählt eine Handler-Variante für einen Benutzer aus
   */
  public selectHandler(testId: string, userId: string): BaseHandler {
    return this.manager.selectVariant(testId, userId);
  }

  /**
   * Zeichnet Metriken für eine Test-Variante auf
   */
  public recordMetrics(
    testId: string,
    variantId: string,
    metrics: Record<string, number>
  ): void {
    // Metriken in beiden Systemen aufzeichnen
    this.manager.recordMetrics(testId, variantId, metrics);
    this.monitoring.recordABTestMetrics(testId, variantId, metrics);
  }

  /**
   * Ruft die aktuellen Testergebnisse ab
   */
  public getTestResults(testId: string) {
    return this.manager.getTestResults(testId);
  }

  /**
   * Ruft alle aktiven Tests ab
   */
  public getActiveTests(): string[] {
    return Array.from(this.manager['tests'].keys());
  }

  /**
   * Ruft die Prometheus-Metriken ab
   */
  public async getMetrics(): Promise<string> {
    return this.monitoring.getMetrics();
  }

  /**
   * Prüft, ob ein Test aktiv ist
   */
  public isTestActive(testId: string): boolean {
    return this.manager['tests'].has(testId);
  }

  /**
   * Beendet einen Test
   */
  public endTest(testId: string): void {
    if (!this.isTestActive(testId)) {
      throw new Error(`Test ${testId} not found`);
    }

    // Finale Metriken aufzeichnen
    const results = this.getTestResults(testId);
    results.forEach(result => {
      this.monitoring.recordABTestMetrics(testId, result.variant, {
        final_sample_size: result.sampleSize,
        ...result.metrics
      });
    });

    // Test aus dem Manager entfernen
    this.manager['tests'].delete(testId);
    this.manager['results'].delete(testId);
  }
} 