import type { Redis } from "ioredis";
import type { Decision, RateLimiter } from "../types.js";

/**
 * Milestone 2b: token bucket shared by every app server, stored in Redis.
 *
 * The read-refill-spend-write cycle has to be atomic, or two servers can
 * spend the same token. Redis runs a Lua script as one atomic step, so put
 * the whole cycle in the script below.
 *
 * Things to decide (and write down in the README afterwards):
 * - Which clock do you use for refill: the app server's Date.now() or Redis's
 *   own TIME command? What goes wrong with the first when servers' clocks drift?
 * - Which Redis type holds the state? (HSET/HMGET on a hash works well.)
 * - Idle keys should not live forever. When can you safely expire one?
 *
 * Lua cheat sheet: KEYS[1], ARGV[n] are strings (use tonumber), redis.call(...)
 * runs a command, and returning a Lua table gives ioredis a JS array.
 * Return fractional numbers as strings: Redis truncates Lua numbers to integers.
 */
const SCRIPT = `
local key      = KEYS[1]
local capacity = tonumber(ARGV[1])
local rate     = tonumber(ARGV[2]) -- tokens per millisecond
local cost     = tonumber(ARGV[3])

-- TODO
return { 0, "0" }
`;

export class RedisTokenBucket implements RateLimiter {
  constructor(
    private readonly redis: Redis,
    private readonly capacity: number,
    private readonly refillPerSec: number,
    private readonly prefix = "rl:tb:",
  ) {
    // Registers the script once; afterwards ioredis calls it via EVALSHA.
    redis.defineCommand("tokenBucket", { numberOfKeys: 1, lua: SCRIPT });
  }

  async consume(key: string, cost = 1): Promise<Decision> {
    // Call it like: await (this.redis as any).tokenBucket(this.prefix + key, this.capacity, this.refillPerSec / 1000, cost)
    throw new Error("TODO: implement RedisTokenBucket.consume");
  }
}
