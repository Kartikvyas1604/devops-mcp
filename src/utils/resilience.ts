/**
 * DevOps Omnibus - Resilience Patterns
 * Circuit breaker, retry, bulkhead, and timeout patterns
 */

/**
 * Circuit breaker states
 */
export enum CircuitState {
    CLOSED = 'closed',     // Normal operation
    OPEN = 'open',         // Failing, reject requests
    HALF_OPEN = 'half_open' // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
interface CircuitBreakerConfig {
    failureThreshold: number;    // Failures before opening
    successThreshold: number;    // Successes to close from half-open
    timeout: number;             // Time in open state before half-open
    volumeThreshold: number;     // Minimum requests before tripping
    errorFilter?: (error: Error) => boolean; // Filter which errors count
}

/**
 * Circuit breaker statistics
 */
interface CircuitStats {
    state: CircuitState;
    failures: number;
    successes: number;
    consecutiveFailures: number;
    consecutiveSuccesses: number;
    lastFailureTime?: number;
    lastSuccessTime?: number;
    totalRequests: number;
    failureRate: number;
}

/**
 * Circuit Breaker Pattern
 * Prevents cascading failures by failing fast when service is unavailable
 */
export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failures: number = 0;
    private successes: number = 0;
    private consecutiveFailures: number = 0;
    private consecutiveSuccesses: number = 0;
    private lastFailureTime?: number;
    private lastSuccessTime?: number;
    private totalRequests: number = 0;
    private lastStateChange: number = Date.now();
    private config: CircuitBreakerConfig;

    constructor(config: Partial<CircuitBreakerConfig> = {}) {
        this.config = {
            failureThreshold: config.failureThreshold ?? 5,
            successThreshold: config.successThreshold ?? 3,
            timeout: config.timeout ?? 30000,
            volumeThreshold: config.volumeThreshold ?? 10,
            errorFilter: config.errorFilter
        };
    }

    /**
     * Execute function with circuit breaker protection
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        this.checkState();

        if (this.state === CircuitState.OPEN) {
            throw new CircuitOpenError('Circuit breaker is open');
        }

        this.totalRequests++;

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure(error as Error);
            throw error;
        }
    }

    /**
     * Get current state
     */
    getState(): CircuitState {
        this.checkState();
        return this.state;
    }

    /**
     * Get statistics
     */
    getStats(): CircuitStats {
        return {
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            consecutiveFailures: this.consecutiveFailures,
            consecutiveSuccesses: this.consecutiveSuccesses,
            lastFailureTime: this.lastFailureTime,
            lastSuccessTime: this.lastSuccessTime,
            totalRequests: this.totalRequests,
            failureRate: this.totalRequests > 0 ? this.failures / this.totalRequests : 0
        };
    }

    /**
     * Manually reset the circuit
     */
    reset(): void {
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.successes = 0;
        this.consecutiveFailures = 0;
        this.consecutiveSuccesses = 0;
        this.totalRequests = 0;
        this.lastStateChange = Date.now();
    }

    /**
     * Force open the circuit
     */
    trip(): void {
        this.state = CircuitState.OPEN;
        this.lastStateChange = Date.now();
    }

    private checkState(): void {
        if (this.state === CircuitState.OPEN) {
            const timeSinceOpen = Date.now() - this.lastStateChange;
            if (timeSinceOpen >= this.config.timeout) {
                this.state = CircuitState.HALF_OPEN;
                this.consecutiveSuccesses = 0;
                this.lastStateChange = Date.now();
            }
        }
    }

    private onSuccess(): void {
        this.successes++;
        this.consecutiveSuccesses++;
        this.consecutiveFailures = 0;
        this.lastSuccessTime = Date.now();

        if (this.state === CircuitState.HALF_OPEN) {
            if (this.consecutiveSuccesses >= this.config.successThreshold) {
                this.state = CircuitState.CLOSED;
                this.lastStateChange = Date.now();
            }
        }
    }

    private onFailure(error: Error): void {
        // Check if this error should be counted
        if (this.config.errorFilter && !this.config.errorFilter(error)) {
            return;
        }

        this.failures++;
        this.consecutiveFailures++;
        this.consecutiveSuccesses = 0;
        this.lastFailureTime = Date.now();

        if (this.state === CircuitState.HALF_OPEN) {
            this.state = CircuitState.OPEN;
            this.lastStateChange = Date.now();
        } else if (this.state === CircuitState.CLOSED) {
            if (this.totalRequests >= this.config.volumeThreshold &&
                this.consecutiveFailures >= this.config.failureThreshold) {
                this.state = CircuitState.OPEN;
                this.lastStateChange = Date.now();
            }
        }
    }
}

/**
 * Circuit open error
 */
export class CircuitOpenError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CircuitOpenError';
    }
}

/**
 * Retry configuration
 */
interface RetryConfig {
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    jitter: boolean;
    retryableErrors?: (error: Error) => boolean;
    onRetry?: (attempt: number, error: Error, delay: number) => void;
}

/**
 * Retry with exponential backoff
 */
export class RetryManager {
    private config: RetryConfig;

    constructor(config: Partial<RetryConfig> = {}) {
        this.config = {
            maxAttempts: config.maxAttempts ?? 3,
            initialDelay: config.initialDelay ?? 1000,
            maxDelay: config.maxDelay ?? 30000,
            backoffMultiplier: config.backoffMultiplier ?? 2,
            jitter: config.jitter ?? true,
            retryableErrors: config.retryableErrors,
            onRetry: config.onRetry
        };
    }

    /**
     * Execute function with retry
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        let lastError: Error | undefined;
        let delay = this.config.initialDelay;

        for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error as Error;

                // Check if error is retryable
                if (this.config.retryableErrors && !this.config.retryableErrors(lastError)) {
                    throw lastError;
                }

                // Don't retry on last attempt
                if (attempt === this.config.maxAttempts) {
                    break;
                }

                // Calculate delay with jitter
                let actualDelay = Math.min(delay, this.config.maxDelay);
                if (this.config.jitter) {
                    actualDelay = actualDelay * (0.5 + Math.random());
                }

                this.config.onRetry?.(attempt, lastError, actualDelay);

                await this.sleep(actualDelay);
                delay *= this.config.backoffMultiplier;
            }
        }

        throw lastError;
    }

    /**
     * Create a retried version of a function
     */
    wrap<T extends (...args: unknown[]) => Promise<unknown>>(fn: T): T {
        return ((...args: Parameters<T>) => this.execute(() => fn(...args) as Promise<unknown>)) as T;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Bulkhead configuration
 */
interface BulkheadConfig {
    maxConcurrent: number;
    maxQueue: number;
    queueTimeout: number;
}

/**
 * Bulkhead pattern for concurrency control
 */
export class Bulkhead {
    private running: number = 0;
    private queue: Array<{
        resolve: () => void;
        reject: (error: Error) => void;
        timeout: NodeJS.Timeout;
    }> = [];
    private config: BulkheadConfig;

    constructor(config: Partial<BulkheadConfig> = {}) {
        this.config = {
            maxConcurrent: config.maxConcurrent ?? 10,
            maxQueue: config.maxQueue ?? 100,
            queueTimeout: config.queueTimeout ?? 30000
        };
    }

    /**
     * Execute function with concurrency control
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        await this.acquire();
        try {
            return await fn();
        } finally {
            this.release();
        }
    }

    /**
     * Get current stats
     */
    getStats(): { running: number; queued: number; available: number } {
        return {
            running: this.running,
            queued: this.queue.length,
            available: this.config.maxConcurrent - this.running
        };
    }

    private async acquire(): Promise<void> {
        if (this.running < this.config.maxConcurrent) {
            this.running++;
            return;
        }

        if (this.queue.length >= this.config.maxQueue) {
            throw new BulkheadRejectedError('Bulkhead queue is full');
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                const index = this.queue.findIndex(item => item.resolve === resolve);
                if (index !== -1) {
                    this.queue.splice(index, 1);
                    reject(new BulkheadRejectedError('Bulkhead queue timeout'));
                }
            }, this.config.queueTimeout);

            this.queue.push({ resolve, reject, timeout });
        });
    }

    private release(): void {
        this.running--;

        if (this.queue.length > 0) {
            const next = this.queue.shift()!;
            clearTimeout(next.timeout);
            this.running++;
            next.resolve();
        }
    }
}

/**
 * Bulkhead rejected error
 */
export class BulkheadRejectedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BulkheadRejectedError';
    }
}

/**
 * Timeout wrapper
 */
export class TimeoutController {
    /**
     * Execute function with timeout
     */
    static async execute<T>(
        fn: () => Promise<T>,
        timeoutMs: number,
        message: string = 'Operation timed out'
    ): Promise<T> {
        let timeoutId: NodeJS.Timeout;

        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new TimeoutError(message, timeoutMs));
            }, timeoutMs);
        });

        try {
            return await Promise.race([fn(), timeoutPromise]);
        } finally {
            clearTimeout(timeoutId!);
        }
    }

    /**
     * Create a timeout-wrapped version of a function
     */
    static wrap<T extends (...args: unknown[]) => Promise<unknown>>(
        fn: T,
        timeoutMs: number,
        message?: string
    ): T {
        return ((...args: Parameters<T>) =>
            TimeoutController.execute(() => fn(...args) as Promise<unknown>, timeoutMs, message)
        ) as T;
    }
}

/**
 * Timeout error
 */
export class TimeoutError extends Error {
    constructor(message: string, public readonly timeout: number) {
        super(message);
        this.name = 'TimeoutError';
    }
}

/**
 * Combined resilience policy
 */
export class ResiliencePolicy {
    private circuitBreaker?: CircuitBreaker;
    private retryManager?: RetryManager;
    private bulkhead?: Bulkhead;
    private timeout?: number;

    /**
     * Add circuit breaker
     */
    withCircuitBreaker(config?: Partial<CircuitBreakerConfig>): this {
        this.circuitBreaker = new CircuitBreaker(config);
        return this;
    }

    /**
     * Add retry
     */
    withRetry(config?: Partial<RetryConfig>): this {
        this.retryManager = new RetryManager(config);
        return this;
    }

    /**
     * Add bulkhead
     */
    withBulkhead(config?: Partial<BulkheadConfig>): this {
        this.bulkhead = new Bulkhead(config);
        return this;
    }

    /**
     * Add timeout
     */
    withTimeout(ms: number): this {
        this.timeout = ms;
        return this;
    }

    /**
     * Execute function with all configured policies
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        let wrappedFn = fn;

        // Apply timeout
        if (this.timeout) {
            const timeoutMs = this.timeout;
            const originalFn = wrappedFn;
            wrappedFn = () => TimeoutController.execute(originalFn, timeoutMs);
        }

        // Apply retry (wraps timeout)
        if (this.retryManager) {
            const retry = this.retryManager;
            const originalFn = wrappedFn;
            wrappedFn = () => retry.execute(originalFn);
        }

        // Apply circuit breaker (wraps retry)
        if (this.circuitBreaker) {
            const cb = this.circuitBreaker;
            const originalFn = wrappedFn;
            wrappedFn = () => cb.execute(originalFn);
        }

        // Apply bulkhead (outermost)
        if (this.bulkhead) {
            const bh = this.bulkhead;
            const originalFn = wrappedFn;
            wrappedFn = () => bh.execute(originalFn);
        }

        return wrappedFn();
    }

    /**
     * Wrap a function with the policy
     */
    wrap<T extends (...args: unknown[]) => Promise<unknown>>(fn: T): T {
        return ((...args: Parameters<T>) => this.execute(() => fn(...args) as Promise<unknown>)) as T;
    }
}

/**
 * Create a resilience policy builder
 */
export function resilience(): ResiliencePolicy {
    return new ResiliencePolicy();
}

/**
 * Rate limiter using token bucket algorithm
 */
export class TokenBucketRateLimiter {
    private tokens: number;
    private lastRefill: number;

    constructor(
        private readonly capacity: number,
        private readonly refillRate: number // tokens per second
    ) {
        this.tokens = capacity;
        this.lastRefill = Date.now();
    }

    /**
     * Try to acquire a token
     */
    tryAcquire(tokens: number = 1): boolean {
        this.refill();
        if (this.tokens >= tokens) {
            this.tokens -= tokens;
            return true;
        }
        return false;
    }

    /**
     * Wait until token is available
     */
    async acquire(tokens: number = 1): Promise<void> {
        while (!this.tryAcquire(tokens)) {
            const waitTime = ((tokens - this.tokens) / this.refillRate) * 1000;
            await new Promise(resolve => setTimeout(resolve, Math.max(10, waitTime)));
        }
    }

    /**
     * Execute with rate limiting
     */
    async execute<T>(fn: () => Promise<T>, tokens: number = 1): Promise<T> {
        await this.acquire(tokens);
        return fn();
    }

    private refill(): void {
        const now = Date.now();
        const timePassed = (now - this.lastRefill) / 1000;
        this.tokens = Math.min(this.capacity, this.tokens + timePassed * this.refillRate);
        this.lastRefill = now;
    }

    /**
     * Get available tokens
     */
    getAvailableTokens(): number {
        this.refill();
        return Math.floor(this.tokens);
    }
}

/**
 * Sliding window rate limiter
 */
export class SlidingWindowRateLimiter {
    private timestamps: number[] = [];

    constructor(
        private readonly maxRequests: number,
        private readonly windowMs: number
    ) {}

    /**
     * Check if request is allowed
     */
    isAllowed(): boolean {
        const now = Date.now();
        const windowStart = now - this.windowMs;

        // Remove old timestamps
        this.timestamps = this.timestamps.filter(t => t > windowStart);

        if (this.timestamps.length < this.maxRequests) {
            this.timestamps.push(now);
            return true;
        }

        return false;
    }

    /**
     * Execute with rate limiting
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        if (!this.isAllowed()) {
            const oldestTimestamp = this.timestamps[0];
            const waitTime = oldestTimestamp + this.windowMs - Date.now();
            if (waitTime > 0) {
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
            // Recursive retry after waiting
            return this.execute(fn);
        }
        return fn();
    }

    /**
     * Get remaining requests in current window
     */
    getRemaining(): number {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        this.timestamps = this.timestamps.filter(t => t > windowStart);
        return Math.max(0, this.maxRequests - this.timestamps.length);
    }
}
