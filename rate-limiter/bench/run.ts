/**
 * Milestone 5: prove it works across servers.
 *
 * Starts N copies of the demo server (like N pods behind a load balancer),
 * points them all at the same API key, hammers them for a few seconds and
 * compares how many requests got through against what the limit should allow.
 *
 *   npm run bench -- --store memory --instances 3     # each server has its own buckets
 *   npm run bench -- --store redis  --instances 3     # one shared bucket in Redis
 *   npm run bench -- --store redis  --algo naive      # the race condition, live
 *
 * Options: --store memory|redis  --algo token-bucket|sliding-log|sliding-counter|fixed-window|naive
 *          --instances 3  --seconds 5  --limit 100  --window-ms 1000  --connections 30
 */
import { spawn, type ChildProcess } from "node:child_process";
import { parseArgs } from "node:util";
import autocannon from "autocannon";

const { values: a } = parseArgs({
  options: {
    store: { type: "string", default: "memory" },
    algo: { type: "string", default: "token-bucket" },
    instances: { type: "string", default: "3" },
    seconds: { type: "string", default: "5" },
    limit: { type: "string", default: "100" },
    "window-ms": { type: "string", default: "1000" },
    connections: { type: "string", default: "30" },
  },
});
const instances = Number(a.instances), seconds = Number(a.seconds);
const limit = Number(a.limit), windowMs = Number(a["window-ms"]);
const basePort = 4100;

function start(port: number): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
      env: { ...process.env, PORT: String(port), STORE: a.store, ALGO: a.algo, LIMIT: String(limit), WINDOW_MS: String(windowMs) },
      stdio: ["ignore", "pipe", "inherit"],
    });
    p.stdout!.on("data", (d) => { if (String(d).includes("listening")) resolve(p); });
    p.on("exit", (code) => reject(new Error(`server on :${port} exited with ${code}`)));
  });
}

function hammer(port: number): Promise<autocannon.Result> {
  return autocannon({
    url: `http://127.0.0.1:${port}/api`,
    headers: { "x-api-key": "bench" },
    connections: Number(a.connections),
    duration: seconds,
  });
}

const servers = await Promise.all(Array.from({ length: instances }, (_, i) => start(basePort + i)));
try {
  const results = await Promise.all(servers.map((_, i) => hammer(basePort + i)));
  const ok = results.reduce((s, r) => s + r["2xx"], 0);
  const limited = results.reduce((s, r) => s + r.non2xx, 0);
  // Token bucket: full bucket at the start, then `limit` per window.
  // Window algorithms: `limit` per window.
  const windows = (seconds * 1000) / windowMs;
  const expected = Math.round(a.algo === "token-bucket" ? limit + limit * windows : limit * windows);
  const p = (q: "p50" | "p99") => Math.max(...results.map((r) => r.latency[q]));

  console.log(`\nstore=${a.store} algo=${a.algo} instances=${instances} limit=${limit}/${windowMs}ms for ${seconds}s`);
  console.table({
    "requests sent": ok + limited,
    "allowed (2xx)": ok,
    "rate limited (429)": limited,
    "should allow about": expected,
    "over-admit factor": +(ok / expected).toFixed(2),
    "latency p50 ms": p("p50"),
    "latency p99 ms": p("p99"),
  });
} finally {
  servers.forEach((s) => s.kill());
}
