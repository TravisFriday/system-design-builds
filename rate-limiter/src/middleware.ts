import type { IncomingMessage, ServerResponse } from "node:http";
import type { RateLimiter } from "./types.js";

export interface RateLimitOptions {
  limiter: RateLimiter;
  /** Who is being limited. Defaults to the API key header, then the client IP. */
  keyOf?: (req: IncomingMessage) => string;
  /** Some routes can cost more than one unit (e.g. a bulk export). */
  costOf?: (req: IncomingMessage) => number;
}

export const defaultKey = (req: IncomingMessage): string => {
  const apiKey = req.headers["x-api-key"];
  if (typeof apiKey === "string" && apiKey) return `key:${apiKey}`;
  return `ip:${req.socket.remoteAddress ?? "unknown"}`;
};

/**
 * Milestone 3: HTTP middleware.
 *
 * Returns a handler that resolves true when the request may continue.
 * On every request set (values per the IETF RateLimit header draft):
 *   RateLimit-Limit      the limit
 *   RateLimit-Remaining  requests left
 *   RateLimit-Reset      seconds until full capacity (round up)
 * On a deny, also respond 429 with a Retry-After header (whole seconds,
 * at least 1) and a JSON body {"error":"rate_limited", ...}, then resolve false.
 */
export function rateLimit(opts: RateLimitOptions) {
  const keyOf = opts.keyOf ?? defaultKey;
  return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    throw new Error("TODO: implement the rate limit middleware");
  };
}
