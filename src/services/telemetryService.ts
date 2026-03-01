/**
 * Telemetry Service - Application telemetry and monitoring
 * Note: Requires applicationinsights package for Azure App Insights integration
 * Falls back to console logging when not available
 */

class TelemetryService {
    private client: unknown;
    private initialized = false;

    constructor(instrumentationKey: string) {
        this.initializeClient(instrumentationKey);
    }

    private async initializeClient(instrumentationKey: string): Promise<void> {
        try {
            const appInsights = await import('applicationinsights').catch(() => null);
            if (appInsights) {
                this.client = new appInsights.TelemetryClient(instrumentationKey);
                this.initialized = true;
            }
        } catch {
            console.warn('applicationinsights not available. Using console fallback.');
        }
    }

    public trackEvent(eventName: string, properties?: { [key: string]: string }): void {
        if (this.initialized && this.client) {
            const client = this.client as { trackEvent: (evt: { name: string; properties?: Record<string, string> }) => void };
            client.trackEvent({ name: eventName, properties });
        } else {
            console.log('[Telemetry Event]', eventName, properties);
        }
    }

    public trackException(exception: Error): void {
        if (this.initialized && this.client) {
            const client = this.client as { trackException: (exc: { exception: Error }) => void };
            client.trackException({ exception });
        } else {
            console.error('[Telemetry Exception]', exception.message, exception.stack);
        }
    }

    public trackMetric(metricName: string, value: number, properties?: { [key: string]: string }): void {
        if (this.initialized && this.client) {
            const client = this.client as { trackMetric: (m: { name: string; value: number; properties?: Record<string, string> }) => void };
            client.trackMetric({ name: metricName, value, properties });
        } else {
            console.log('[Telemetry Metric]', metricName, value, properties);
        }
    }

    public trackTrace(message: string, properties?: { [key: string]: string }): void {
        if (this.initialized && this.client) {
            const client = this.client as { trackTrace: (t: { message: string; properties?: Record<string, string> }) => void };
            client.trackTrace({ message, properties });
        } else {
            console.log('[Telemetry Trace]', message, properties);
        }
    }

    public flush(): void {
        if (this.initialized && this.client) {
            const client = this.client as { flush: () => void };
            client.flush();
        }
    }
}

// Create singleton instance with optional instrumentation key from environment
const telemetryService = new TelemetryService(process.env.APPINSIGHTS_INSTRUMENTATIONKEY || '');

export default telemetryService;
export { TelemetryService };