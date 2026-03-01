// Error handler
export { handleError } from './errorHandler';

// Rate limiter - use built-in resilience module instead
export { TokenBucketRateLimiter, SlidingWindowRateLimiter } from './resilience';

// Validator functions
export { validateEmail, validateURL, validateConfig } from './validator';

// Advanced caching
export {
    AdvancedCache,
    RequestDeduplicator,
    TTLMap,
    memoize,
    createNamespacedCache,
    apiResponseCache,
    providerStateCache,
    commandResultCache
} from './cache';

// Metrics and observability
export {
    MetricsRegistry,
    Counter,
    Gauge,
    Histogram,
    Timer,
    metrics,
    commandMetrics,
    apiMetrics,
    providerMetrics
} from './metrics';

// Resilience patterns
export {
    CircuitBreaker,
    CircuitState,
    CircuitOpenError,
    RetryManager,
    Bulkhead,
    BulkheadRejectedError,
    TimeoutController,
    TimeoutError,
    ResiliencePolicy,
    resilience
} from './resilience';

// Legacy aliases
export const errorHandler = { handleError: (e: Error) => { handleError(e); } };
export const rateLimiter = new (class { async execute<T>(fn: () => Promise<T>) { return fn(); } })();
export const validator = { validateEmail, validateURL, validateConfig };