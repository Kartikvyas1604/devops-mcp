import { TelemetryClient } from 'applicationinsights';

class TelemetryService {
    private client: TelemetryClient;

    constructor(instrumentationKey: string) {
        this.client = new TelemetryClient(instrumentationKey);
    }

    public trackEvent(eventName: string, properties?: { [key: string]: string }): void {
        this.client.trackEvent({ name: eventName, properties });
    }

    public trackException(exception: Error): void {
        this.client.trackException({ exception });
    }

    public trackMetric(metricName: string, value: number, properties?: { [key: string]: string }): void {
        this.client.trackMetric({ name: metricName, value, properties });
    }

    public trackTrace(message: string, properties?: { [key: string]: string }): void {
        this.client.trackTrace({ message, properties });
    }

    public flush(): void {
        this.client.flush();
    }
}

export default TelemetryService;