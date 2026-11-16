/** The outcome of asking a limiter whether a request may proceed. */
export interface Decision {
  allowed: boolean;
  /** The configured maximum (bucket capacity or requests per window). */
  limit: number;
  /** Requests still available right after this decision. */
  remaining: number;
  /** Milliseconds until the limiter is back to full capacity. */
  resetMs: number;
  /** Milliseconds the caller should wait before retrying. 0 when allowed. */
  retryAfterMs: number;
}

export interface RateLimiter {
  /** Try to spend `cost` units for `key`. Must be safe to call concurrently. */
  consume(key: string, cost?: number): Promise<Decision>;
}

/** Milliseconds since epoch. Injected so tests can control time. */
export type Clock = () => number;

export const systemClock: Clock = () => Date.now();
