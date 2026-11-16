import type { Redis } from "ioredis";
import type { Decision, RateLimiter } from "../types.js";

/**
 * Milestone 2a: the WRONG way, on purpose.
 *
 * Write a fixed window counter on Redis the obvious way: GET the count,
 * compare it in Node, then SET the new count, as separate round trips.
 * The test for this class expects it to let MORE than `limit` through when
 * 200 requests arrive at once. Get that test passing, then explain to
 * yourself why it happens. That's the reason milestones 2b and 2c use Lua.
 */
export class NaiveRedisCounter implements RateLimiter {
  constructor(
    private readonly redis: Redis,
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly prefix = "rl:naive:",
  ) {}

  async consume(key: string, cost = 1): Promise<Decision> {
    throw new Error("TODO: implement NaiveRedisCounter.consume");
  }
}
