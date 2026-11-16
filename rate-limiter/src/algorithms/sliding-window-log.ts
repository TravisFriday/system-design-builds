import { type Clock, type Decision, type RateLimiter, systemClock } from "../types.js";

/**
 * Milestone 1c: sliding window log.
 *
 * Remember the timestamp of every accepted request; a request is allowed if
 * fewer than `limit` timestamps fall inside the last `windowMs`.
 * Exact, but what does it cost in memory per key?
 *
 * retryAfterMs on a deny: how long until enough old entries slide out for
 * this request's `cost` to fit?
 */
export class SlidingWindowLog implements RateLimiter {
  // TODO: per-key state

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: Clock = systemClock,
  ) {}

  async consume(key: string, cost = 1): Promise<Decision> {
    throw new Error("TODO: implement SlidingWindowLog.consume");
  }
}
