import type { Redis } from "ioredis";
import type { Decision, RateLimiter } from "../types.js";

/**
 * Milestone 2c: sliding window log on a Redis sorted set.
 *
 * Score = timestamp in ms. In one Lua script: drop entries older than the
 * window (ZREMRANGEBYSCORE), count what's left (ZCARD), and add this request
 * (ZADD) only if it fits.
 *
 * Gotcha: sorted set members must be unique. Two requests in the same
 * millisecond with the same member collapse into one entry. How will you
 * make each member unique?
 */
const SCRIPT = `
local key    = KEYS[1]
local limit  = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local cost   = tonumber(ARGV[3])

-- TODO
return { 0 }
`;

export class RedisSlidingWindowLog implements RateLimiter {
  constructor(
    private readonly redis: Redis,
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly prefix = "rl:swl:",
  ) {
    redis.defineCommand("slidingLog", { numberOfKeys: 1, lua: SCRIPT });
  }

  async consume(key: string, cost = 1): Promise<Decision> {
    throw new Error("TODO: implement RedisSlidingWindowLog.consume");
  }
}
