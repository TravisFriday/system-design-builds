import type { Decision, RateLimiter } from "./types.js";

/**
 * Milestone 4: what happens when Redis is down or slow?
 *
 * Wrap the shared limiter. If it throws, or takes longer than `timeoutMs`,
 * call `onError` and use `fallback` (a per-process limiter) instead. If
 * `fallback` is null, allow the request (fail open completely).
 *
 * Interview question to answer in your README: when would you fail CLOSED
 * instead (deny everything while the store is down)?
 */
export class FailOpen implements RateLimiter {
  constructor(
    private readonly primary: RateLimiter,
    private readonly fallback: RateLimiter | null,
    private readonly opts: { timeoutMs?: number; onError?: (err: unknown) => void } = {},
  ) {}

  async consume(key: string, cost = 1): Promise<Decision> {
    throw new Error("TODO: implement FailOpen.consume");
  }
}
