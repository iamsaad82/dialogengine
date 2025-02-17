import { Histogram, Counter } from 'prom-client';

export class MonitoringService {
  private handlerLatency: Histogram<string>;
  private errorCounter: Counter<string>;

  constructor() {
    this.handlerLatency = new Histogram({
      name: 'handler_latency_seconds',
      help: 'Latency of handler execution in seconds',
      labelNames: ['handler_type']
    });

    this.errorCounter = new Counter({
      name: 'handler_errors_total',
      help: 'Total number of handler errors',
      labelNames: ['handler_type']
    });
  }

  public recordHandlerLatency(duration: number): void {
    if (this.handlerLatency) {
      this.handlerLatency.observe(duration);
    }
  }

  public recordError(handlerType: string): void {
    if (this.errorCounter) {
      this.errorCounter.inc({ handler_type: handlerType });
    }
  }
} 