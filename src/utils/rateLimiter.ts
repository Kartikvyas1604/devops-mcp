import { RateLimiter } from 'limiter';

const limiter = new RateLimiter({
  tokensPerInterval: 5, // Number of allowed requests
  interval: 'minute', // Time interval for the rate limit
});

export const executeWithRateLimit = async (action: () => Promise<void>) => {
  await limiter.removeTokens(1); // Remove a token for the action
  await action(); // Execute the action
};