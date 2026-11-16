import { type Clock, type Decision, type RateLimiter, systemClock } from "../types.js";

/**
 * Milestone 1a: fixed window counter.
 *
 * One counter per key per window. Window start = now - (now % windowMs).
 * Cheapest option, but think about what happens at a window boundary
 * (test/memory.test.ts has a test that pins down that weakness on purpose).
 */
export class FixedWindow implements RateLimiter {
  // TODO: per-key state. What's the least you need to store?

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: Clock = systemClock,
  ) {}

  async consume(key: string, cost = 1): Promise<Decision> {
    throw new Error("TODO: implement FixedWindow.consume");
  }
}
