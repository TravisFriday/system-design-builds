import { type Clock, type Decision, type RateLimiter, systemClock } from "../types.js";

/**
 * Milestone 1b: token bucket.
 *
 * Each key has a bucket holding up to `capacity` tokens that refills
 * continuously at `refillPerSec`. A request spends `cost` tokens.
 * Hint: you don't need a timer to refill. Store the token count and when
 * you last looked, and top up lazily on each call.
 */
export class TokenBucket implements RateLimiter {
  // TODO: per-key state

  constructor(
    private readonly capacity: number,
    private readonly refillPerSec: number,
    private readonly now: Clock = systemClock,
  ) {}

  async consume(key: string, cost = 1): Promise<Decision> {
    throw new Error("TODO: implement TokenBucket.consume");
  }
}
