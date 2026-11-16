import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { Redis } from "ioredis";
import { RedisTokenBucket } from "../src/redis/token-bucket.js";
import { RedisSlidingWindowLog } from "../src/redis/sliding-window-log.js";
import { NaiveRedisCounter } from "../src/redis/naive-counter.js";
import { FailOpen } from "../src/fail-open.js";
import { TokenBucket } from "../src/algorithms/token-bucket.js";
import type { RateLimiter } from "../src/types.js";

// Integration tests need a real Redis. Set REDIS_URL to run them (CI does).
const url = process.env.REDIS_URL;
const opts = { skip: url ? false : "set REDIS_URL to run Redis tests" };

let redis: Redis;
before(async () => { if (url) { redis = new Redis(url); await redis.flushdb(); } });
after(async () => { await redis?.quit(); });

const unique = () => `t${Date.now()}${Math.random().toString(36).slice(2)}`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fire n requests at once and count how many were allowed. */
async function burst(l: RateLimiter, n: number, key: string): Promise<number> {
  const results = await Promise.all(Array.from({ length: n }, () => l.consume(key)));
  return results.filter((d) => d.allowed).length;
}

test("redis token bucket: exactly capacity allowed under 500 concurrent requests", opts, async () => {
  // Several clients = several app servers sharing one Redis.
  const clients = [redis, new Redis(url!), new Redis(url!)];
  const limiters = clients.map((c) => new RedisTokenBucket(c, 50, 0.001));
  const key = unique();
  try {
    const results = await Promise.all(
      Array.from({ length: 500 }, (_, i) => limiters[i % limiters.length].consume(key)),
    );
    assert.equal(results.filter((d) => d.allowed).length, 50);
  } finally {
    await Promise.all(clients.slice(1).map((c) => c.quit()));
  }
});

test("redis token bucket: refills over time", opts, async () => {
  const tb = new RedisTokenBucket(redis, 5, 20); // 20/sec = 1 per 50ms
  const key = unique();
  assert.equal(await burst(tb, 10, key), 5);
  await sleep(220); // ~4 tokens
  const n = await burst(tb, 10, key);
  assert.ok(n >= 3 && n <= 5, `expected about 4 refilled tokens, got ${n}`);
});

test("redis token bucket: idle keys expire", opts, async () => {
  const tb = new RedisTokenBucket(redis, 2, 1000);
  const key = unique();
  await tb.consume(key);
  const ttl = await redis.pttl("rl:tb:" + key);
  assert.ok(ttl > 0 && ttl <= 1000, `ttl ${ttl}`);
});

test("redis sliding log: exactly limit allowed under concurrency, then slides", opts, async () => {
  const swl = new RedisSlidingWindowLog(redis, 20, 300);
  const key = unique();
  assert.equal(await burst(swl, 200, key), 20);
  const denied = await swl.consume(key);
  assert.equal(denied.allowed, false);
  assert.ok(denied.retryAfterMs > 0 && denied.retryAfterMs <= 300);
  await sleep(320);
  assert.equal(await burst(swl, 30, key), 20);
});

test("naive GET-then-SET counter over-admits under concurrency (why we use Lua)", opts, async () => {
  const naive = new NaiveRedisCounter(redis, 20, 60_000);
  const allowed = await burst(naive, 200, unique());
  assert.ok(allowed > 20, `naive counter allowed ${allowed}, expected more than the limit of 20`);
});

test("fail-open: falls back to the local limiter when Redis is down", opts, async () => {
  const dead = new Redis("redis://127.0.0.1:1", { maxRetriesPerRequest: 0, lazyConnect: true, retryStrategy: () => null });
  let errors = 0;
  const l = new FailOpen(new RedisTokenBucket(dead, 3, 0.001), new TokenBucket(3, 0.001), {
    timeoutMs: 200, onError: () => errors++,
  });
  dead.on("error", () => {}); // connection errors are expected here
  try {
    let ok = 0;
    for (let i = 0; i < 5; i++) if ((await l.consume("k")).allowed) ok++;
    assert.equal(ok, 3);
    assert.equal(errors, 5);
  } finally {
    dead.disconnect();
  }
});
