/**
 * DevOps Omnibus - Metrics Collection System
 * Comprehensive metrics for monitoring and observability
 */

import * as vscode from 'vscode';

/**
 * Metric types
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'timer';

/**
 * Metric entry
 */
interface MetricEntry {
    name: string;
    type: MetricType;
    value: number;
    labels: Record<string, string>;
    timestamp: number;
}

/**
 * Histogram bucket
 */
interface HistogramBucket {
    le: number;
    count: number;
}

/**
 * Timer result
 */
interface TimerResult {
    duration: number;
    success: boolean;
}

/**
 * Metrics snapshot
 */
interface MetricsSnapshot {
    timestamp: number;
    metrics: MetricEntry[];
    histograms: Record<string, { buckets: HistogramBucket[]; sum: number; count: number }>;
    timers: Record<string, { avg: number; min: number; max: number; p50: number; p95: number; p99: number; count: number }>;
}

/**
 * Counter metric
 */
export class Counter {
    private value: number = 0;
    
    constructor(
        public readonly name: string,
        public readonly labels: Record<string, string> = {}
    ) {}

    inc(delta: number = 1): void {
        this.value += delta;
    }

    get(): number {
        return this.value;
    }

    reset(): void {
        this.value = 0;
    }

    toEntry(): MetricEntry {
        return {
            name: this.name,
            type: 'counter',
            value: this.value,
            labels: this.labels,
            timestamp: Date.now()
        };
    }
}

/**
 * Gauge metric
 */
export class Gauge {
    private value: number = 0;

    constructor(
        public readonly name: string,
        public readonly labels: Record<string, string> = {}
    ) {}

    set(value: number): void {
        this.value = value;
    }

    inc(delta: number = 1): void {
        this.value += delta;
    }

    dec(delta: number = 1): void {
        this.value -= delta;
    }

    get(): number {
        return this.value;
    }

    toEntry(): MetricEntry {
        return {
            name: this.name,
            type: 'gauge',
            value: this.value,
            labels: this.labels,
            timestamp: Date.now()
        };
    }
}

/**
 * Histogram metric
 */
export class Histogram {
    private values: number[] = [];
    private bucketBoundaries: number[];
    
    constructor(
        public readonly name: string,
        public readonly labels: Record<string, string> = {},
        buckets: number[] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
    ) {
        this.bucketBoundaries = buckets.sort((a, b) => a - b);
    }

    observe(value: number): void {
        this.values.push(value);
    }

    getBuckets(): HistogramBucket[] {
        const buckets: HistogramBucket[] = [];
        for (const le of this.bucketBoundaries) {
            buckets.push({
                le,
                count: this.values.filter(v => v <= le).length
            });
        }
        buckets.push({
            le: Infinity,
            count: this.values.length
        });
        return buckets;
    }

    getSum(): number {
        return this.values.reduce((a, b) => a + b, 0);
    }

    getCount(): number {
        return this.values.length;
    }

    getPercentile(p: number): number {
        if (this.values.length === 0) return 0;
        const sorted = [...this.values].sort((a, b) => a - b);
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    reset(): void {
        this.values = [];
    }
}

/**
 * Timer metric
 */
export class Timer {
    private durations: TimerResult[] = [];
    private activeTimers: Map<string, number> = new Map();

    constructor(
        public readonly name: string,
        public readonly labels: Record<string, string> = {}
    ) {}

    start(id: string = 'default'): void {
        this.activeTimers.set(id, Date.now());
    }

    stop(id: string = 'default', success: boolean = true): number {
        const startTime = this.activeTimers.get(id);
        if (startTime === undefined) {
            throw new Error(`Timer ${id} not started`);
        }
        const duration = Date.now() - startTime;
        this.activeTimers.delete(id);
        this.durations.push({ duration, success });
        return duration;
    }

    async time<T>(fn: () => Promise<T>): Promise<T> {
        const start = Date.now();
        let success = true;
        try {
            return await fn();
        } catch (error) {
            success = false;
            throw error;
        } finally {
            this.durations.push({ duration: Date.now() - start, success });
        }
    }

    getStats(): { avg: number; min: number; max: number; p50: number; p95: number; p99: number; count: number; successRate: number } {
        if (this.durations.length === 0) {
            return { avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0, count: 0, successRate: 0 };
        }

        const times = this.durations.map(d => d.duration);
        const sorted = [...times].sort((a, b) => a - b);
        const successful = this.durations.filter(d => d.success).length;

        return {
            avg: times.reduce((a, b) => a + b, 0) / times.length,
            min: Math.min(...times),
            max: Math.max(...times),
            p50: sorted[Math.floor(sorted.length * 0.5)],
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)],
            count: this.durations.length,
            successRate: successful / this.durations.length
        };
    }

    reset(): void {
        this.durations = [];
        this.activeTimers.clear();
    }
}

/**
 * Metrics Registry
 */
export class MetricsRegistry {
    private counters: Map<string, Counter> = new Map();
    private gauges: Map<string, Gauge> = new Map();
    private histograms: Map<string, Histogram> = new Map();
    private timers: Map<string, Timer> = new Map();
    private context?: vscode.ExtensionContext;

    initialize(context: vscode.ExtensionContext): void {
        this.context = context;
    }

    /**
     * Get or create a counter
     */
    counter(name: string, labels: Record<string, string> = {}): Counter {
        const key = this.makeKey(name, labels);
        if (!this.counters.has(key)) {
            this.counters.set(key, new Counter(name, labels));
        }
        return this.counters.get(key)!;
    }

    /**
     * Get or create a gauge
     */
    gauge(name: string, labels: Record<string, string> = {}): Gauge {
        const key = this.makeKey(name, labels);
        if (!this.gauges.has(key)) {
            this.gauges.set(key, new Gauge(name, labels));
        }
        return this.gauges.get(key)!;
    }

    /**
     * Get or create a histogram
     */
    histogram(name: string, labels: Record<string, string> = {}, buckets?: number[]): Histogram {
        const key = this.makeKey(name, labels);
        if (!this.histograms.has(key)) {
            this.histograms.set(key, new Histogram(name, labels, buckets));
        }
        return this.histograms.get(key)!;
    }

    /**
     * Get or create a timer
     */
    timer(name: string, labels: Record<string, string> = {}): Timer {
        const key = this.makeKey(name, labels);
        if (!this.timers.has(key)) {
            this.timers.set(key, new Timer(name, labels));
        }
        return this.timers.get(key)!;
    }

    /**
     * Get metrics snapshot
     */
    getSnapshot(): MetricsSnapshot {
        const metrics: MetricEntry[] = [];
        const histogramData: Record<string, { buckets: HistogramBucket[]; sum: number; count: number }> = {};
        const timerData: Record<string, { avg: number; min: number; max: number; p50: number; p95: number; p99: number; count: number }> = {};

        for (const counter of this.counters.values()) {
            metrics.push(counter.toEntry());
        }

        for (const gauge of this.gauges.values()) {
            metrics.push(gauge.toEntry());
        }

        for (const [key, histogram] of this.histograms.entries()) {
            histogramData[key] = {
                buckets: histogram.getBuckets(),
                sum: histogram.getSum(),
                count: histogram.getCount()
            };
        }

        for (const [key, timer] of this.timers.entries()) {
            const stats = timer.getStats();
            timerData[key] = {
                avg: stats.avg,
                min: stats.min,
                max: stats.max,
                p50: stats.p50,
                p95: stats.p95,
                p99: stats.p99,
                count: stats.count
            };
        }

        return {
            timestamp: Date.now(),
            metrics,
            histograms: histogramData,
            timers: timerData
        };
    }

    /**
     * Export metrics in Prometheus format
     */
    exportPrometheus(): string {
        const lines: string[] = [];

        for (const counter of this.counters.values()) {
            const labelsStr = this.formatLabels(counter.labels);
            lines.push(`# TYPE ${counter.name} counter`);
            lines.push(`${counter.name}${labelsStr} ${counter.get()}`);
        }

        for (const gauge of this.gauges.values()) {
            const labelsStr = this.formatLabels(gauge.labels);
            lines.push(`# TYPE ${gauge.name} gauge`);
            lines.push(`${gauge.name}${labelsStr} ${gauge.get()}`);
        }

        for (const histogram of this.histograms.values()) {
            const labelsStr = this.formatLabels(histogram.labels);
            lines.push(`# TYPE ${histogram.name} histogram`);
            for (const bucket of histogram.getBuckets()) {
                const le = bucket.le === Infinity ? '+Inf' : bucket.le.toString();
                lines.push(`${histogram.name}_bucket${this.formatLabels({ ...histogram.labels, le })} ${bucket.count}`);
            }
            lines.push(`${histogram.name}_sum${labelsStr} ${histogram.getSum()}`);
            lines.push(`${histogram.name}_count${labelsStr} ${histogram.getCount()}`);
        }

        return lines.join('\n');
    }

    /**
     * Reset all metrics
     */
    reset(): void {
        this.counters.clear();
        this.gauges.clear();
        this.histograms.clear();
        this.timers.clear();
    }

    private makeKey(name: string, labels: Record<string, string>): string {
        const sortedLabels = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
        return `${name}:${JSON.stringify(sortedLabels)}`;
    }

    private formatLabels(labels: Record<string, string>): string {
        const entries = Object.entries(labels);
        if (entries.length === 0) return '';
        return `{${entries.map(([k, v]) => `${k}="${v}"`).join(',')}}`;
    }
}

// Singleton metrics registry
export const metrics = new MetricsRegistry();

// Pre-defined metrics
export const commandMetrics = {
    executed: metrics.counter('devops_commands_executed_total', { type: 'all' }),
    failed: metrics.counter('devops_commands_failed_total', { type: 'all' }),
    duration: metrics.timer('devops_command_duration_ms')
};

export const apiMetrics = {
    requests: metrics.counter('devops_api_requests_total'),
    errors: metrics.counter('devops_api_errors_total'),
    latency: metrics.histogram('devops_api_latency_ms', {}, [10, 50, 100, 250, 500, 1000, 2500, 5000])
};

export const providerMetrics = {
    connections: metrics.gauge('devops_provider_connections', { type: 'all' }),
    operations: metrics.counter('devops_provider_operations_total'),
    failures: metrics.counter('devops_provider_failures_total')
};
