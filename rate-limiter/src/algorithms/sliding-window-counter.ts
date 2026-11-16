import { type Clock, type Decision, type RateLimiter, systemClock } from "../types.js";

/**
 * Milestone 1d: sliding window counter.
 *
 * Keep the count for the current fixed window and the previous one, and
 * estimate the sliding count as:
 *   previous * (fraction of the previous window still inside the sliding window) + current
 * O(1) memory like the fixed window, without most of its boundary burst.
 * Edge case: what if more than one whole window passed since the last request?
 */
export class SlidingWindowCounter implements RateLimiter {
  // TODO: per-key state

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: Clock = systemClock,
  ) {}

  async consume(key: string, cost = 1): Promise<Decision> {
    throw new Error("TODO: implement SlidingWindowCounter.consume");
  }
}
