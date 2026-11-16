import { test } from "node:test";
import assert from "node:assert/strict";
import { TokenBucket } from "../src/algorithms/token-bucket.js";
import { FixedWindow } from "../src/algorithms/fixed-window.js";
import { SlidingWindowLog } from "../src/algorithms/sliding-window-log.js";
import { SlidingWindowCounter } from "../src/algorithms/sliding-window-counter.js";
import type { RateLimiter } from "../src/types.js";

/** A clock the test moves by hand. */
function fakeClock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => { t += ms; } };
}

async function allowedCount(l: RateLimiter, n: number, key = "k"): Promise<number> {
  let ok = 0;
  for (let i = 0; i < n; i++) if ((await l.consume(key)).allowed) ok++;
  return ok;
}

test("token bucket: allows a burst up to capacity, then denies", async () => {
  const c = fakeClock();
  const tb = new TokenBucket(10, 1, c.now);
  assert.equal(await allowedCount(tb, 15), 10);
  const d = await tb.consume("k");
  assert.equal(d.allowed, false);
  assert.equal(d.retryAfterMs, 1000);
});

test("token bucket: refills at the configured rate and caps at capacity", async () => {
  const c = fakeClock();
  const tb = new TokenBucket(10, 2, c.now); // 2 tokens/sec
  await allowedCount(tb, 10);
  c.advance(1500); // 3 tokens
  assert.equal(await allowedCount(tb, 5), 3);
  c.advance(60_000); // would be 120 tokens, capped at 10
  assert.equal(await allowedCount(tb, 20), 10);
});

test("token bucket: keys are independent", async () => {
  const c = fakeClock();
  const tb = new TokenBucket(2, 1, c.now);
  assert.equal(await allowedCount(tb, 5, "a"), 2);
  assert.equal(await allowedCount(tb, 5, "b"), 2);
});

test("token bucket: a request can cost more than one token", async () => {
  const c = fakeClock();
  const tb = new TokenBucket(10, 1, c.now);
  assert.equal((await tb.consume("k", 8)).allowed, true);
  assert.equal((await tb.consume("k", 3)).allowed, false);
  assert.equal((await tb.consume("k", 2)).allowed, true);
});

test("fixed window: lets 2x the limit through across a window boundary", async () => {
  const c = fakeClock(0);
  const fw = new FixedWindow(10, 1000, c.now);
  c.advance(999);
  assert.equal(await allowedCount(fw, 10), 10);
  c.advance(1); // new window starts
  assert.equal(await allowedCount(fw, 10), 10); // 20 requests in 2ms
});

test("sliding window log: no boundary burst", async () => {
  const c = fakeClock(0);
  const swl = new SlidingWindowLog(10, 1000, c.now);
  c.advance(999);
  assert.equal(await allowedCount(swl, 10), 10);
  c.advance(1);
  assert.equal(await allowedCount(swl, 10), 0);
  c.advance(999); // first batch slides out
  assert.equal(await allowedCount(swl, 10), 10);
});

test("sliding window log: retryAfter points at when the oldest entry expires", async () => {
  const c = fakeClock(0);
  const swl = new SlidingWindowLog(2, 1000, c.now);
  await swl.consume("k");
  c.advance(300);
  await swl.consume("k");
  const d = await swl.consume("k");
  assert.equal(d.allowed, false);
  assert.equal(d.retryAfterMs, 700);
  c.advance(700);
  assert.equal((await swl.consume("k")).allowed, true);
});

test("sliding window counter: weights the previous window", async () => {
  const c = fakeClock(0);
  const swc = new SlidingWindowCounter(10, 1000, c.now);
  assert.equal(await allowedCount(swc, 10), 10); // previous window full
  c.advance(1250); // 25% into next window: previous counts 75% = 7.5
  assert.equal(await allowedCount(swc, 10), 2);
  c.advance(750); // two windows later the old window drops out entirely
  assert.equal(await allowedCount(swc, 20) <= 10, true);
});

test("sliding window counter: an idle gap clears history", async () => {
  const c = fakeClock(0);
  const swc = new SlidingWindowCounter(5, 1000, c.now);
  await allowedCount(swc, 5);
  c.advance(5000);
  assert.equal(await allowedCount(swc, 10), 5);
});
