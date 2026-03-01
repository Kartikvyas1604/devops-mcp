import { TokenBucketRateLimiter } from './resilience';

/**
 * Default rate limiter instance
 * 5 requests per minute
 */
const limiter = new TokenBucketRateLimiter(5, 5 / 60);

/**
 * Execute a function with rate limiting
 */
export const executeWithRateLimit = async <T>(action: () => Promise<T>): Promise<T> => {
    return limiter.execute(action);
};

export { limiter };