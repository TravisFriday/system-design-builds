import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { Redis } from "ioredis";
import { rateLimit } from "./middleware.js";
import { FailOpen } from "./fail-open.js";
import { TokenBucket } from "./algorithms/token-bucket.js";
import { SlidingWindowLog } from "./algorithms/sliding-window-log.js";
import { SlidingWindowCounter } from "./algorithms/sliding-window-counter.js";
import { FixedWindow } from "./algorithms/fixed-window.js";
import { RedisTokenBucket } from "./redis/token-bucket.js";
import { RedisSlidingWindowLog } from "./redis/sliding-window-log.js";
import { NaiveRedisCounter } from "./redis/naive-counter.js";
import type { RateLimiter } from "./types.js";

/**
 * Demo API. Configure with env vars:
 *   PORT=3000  STORE=memory|redis  ALGO=token-bucket|sliding-log|sliding-counter|fixed-window|naive
 *   LIMIT=100 (capacity or requests per window)  WINDOW_MS=60000 (token bucket refills LIMIT per WINDOW_MS)
 *   REDIS_URL=redis://localhost:6379
 */
export function buildLimiter(env = process.env): { limiter: RateLimiter; redis?: Redis } {
  const store = env.STORE ?? "memory";
  const algo = env.ALGO ?? "token-bucket";
  const limit = Number(env.LIMIT ?? 100);
  const windowMs = Number(env.WINDOW_MS ?? 60_000);
  const perSec = (limit * 1000) / windowMs;

  const local = (): RateLimiter => {
    switch (algo) {
      case "sliding-log": return new SlidingWindowLog(limit, windowMs);
      case "sliding-counter": return new SlidingWindowCounter(limit, windowMs);
      case "fixed-window": return new FixedWindow(limit, windowMs);
      default: return new TokenBucket(limit, perSec);
    }
  };
  if (store !== "redis") return { limiter: local() };

  const redis = new Redis(env.REDIS_URL ?? "redis://localhost:6379", { maxRetriesPerRequest: 1 });
  const shared: RateLimiter =
    algo === "sliding-log" ? new RedisSlidingWindowLog(redis, limit, windowMs)
    : algo === "naive" ? new NaiveRedisCounter(redis, limit, windowMs)
    : new RedisTokenBucket(redis, limit, perSec);
  const limiter = new FailOpen(shared, local(), {
    onError: (e) => console.warn(`[rate-limit] falling back to local limiter: ${(e as Error).message}`),
  });
  return { limiter, redis };
}

// Only start listening when run directly (tests import buildLimiter without a server).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { limiter } = buildLimiter();
  const limit = rateLimit({ limiter });
  const port = Number(process.env.PORT ?? 3000);

  createServer(async (req, res) => {
    if (req.url === "/health") return void res.end("ok");
    if (!(await limit(req, res))) return;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true, port }));
  }).listen(port, () => {
    console.log(`listening on :${port} store=${process.env.STORE ?? "memory"} algo=${process.env.ALGO ?? "token-bucket"}`);
  });
}
