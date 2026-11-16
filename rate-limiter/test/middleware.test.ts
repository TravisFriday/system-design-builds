import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { rateLimit } from "../src/middleware.js";
import { TokenBucket } from "../src/algorithms/token-bucket.js";

async function withServer(fn: (base: string) => Promise<void>) {
  const limit = rateLimit({ limiter: new TokenBucket(2, 0.5) });
  const server: Server = createServer(async (req, res) => {
    try {
      if (!(await limit(req, res))) return;
      res.end("ok");
    } catch (err) {
      res.statusCode = 500;
      res.end(String(err));
    }
  });
  await new Promise<void>((r) => server.listen(0, r));
  const { port } = server.address() as AddressInfo;
  try { await fn(`http://127.0.0.1:${port}`); } finally { server.closeAllConnections(); server.close(); }
}

test("middleware: sets RateLimit headers and returns 429 with Retry-After", async () => {
  await withServer(async (base) => {
    const h = { "x-api-key": "abc" };
    const r1 = await fetch(base, { headers: h });
    assert.equal(r1.status, 200);
    assert.equal(r1.headers.get("ratelimit-limit"), "2");
    assert.equal(r1.headers.get("ratelimit-remaining"), "1");
    await fetch(base, { headers: h });
    const r3 = await fetch(base, { headers: h });
    assert.equal(r3.status, 429);
    assert.equal(r3.headers.get("retry-after"), "2"); // 0.5 tokens/sec
    assert.deepEqual((await r3.json()).error, "rate_limited");
  });
});

test("middleware: different API keys get separate limits", async () => {
  await withServer(async (base) => {
    for (let i = 0; i < 2; i++) await fetch(base, { headers: { "x-api-key": "a" } });
    assert.equal((await fetch(base, { headers: { "x-api-key": "a" } })).status, 429);
    assert.equal((await fetch(base, { headers: { "x-api-key": "b" } })).status, 200);
  });
});
