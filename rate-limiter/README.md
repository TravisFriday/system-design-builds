# Rate limiter

A distributed rate limiter you build yourself, milestone by milestone. The scaffolding (types, demo server, tests, benchmark, CI, local Redis) is done. The algorithms are stubs that throw `TODO`, and the tests are the spec: when they're all green, you've built it.

## What you'll be able to say in an interview

- Compared four algorithms (fixed window, sliding log, sliding counter, token bucket) and can explain when each fits.
- Showed a GET-then-SET race letting many times the limit through, and fixed it with atomic Lua scripts.
- Shared limits across several app servers through Redis, and measured the difference against per-server limits.
- Handled the store going down (fail open with a local fallback) and can argue fail open vs fail closed.

## Tools and environment

| What | Use | Why |
| --- | --- | --- |
| Language | TypeScript on Node 22 | You already know it, so your time goes to the design, not the syntax. |
| Editor | VS Code | Add the official **Redis for VS Code** extension to browse keys from the editor. |
| Redis | Docker Desktop (WSL 2 backend) + `docker compose up -d` | One command gives you Redis 7 and Redis Insight. No Docker? Run `sudo apt install redis-server` inside WSL instead. |
| Watching Redis | Redis Insight at http://localhost:5540, and `docker compose exec redis redis-cli MONITOR` | MONITOR prints every command as it runs. Watch it while a test runs and the race condition becomes obvious. |
| Tests | Node's built-in test runner via `tsx` | No framework to learn. `npm run test:watch` reruns on save. |
| Load testing | `autocannon` via `npm run bench` | Starts several servers and floods them, then reports allowed vs expected. |
| CI | GitHub Actions (`.github/workflows/rate-limiter.yml`) | Runs typecheck + all tests against a real Redis on every push. It's red until you finish, which is the point. |
| Diagrams | Excalidraw | Draw the architecture for this README when you write it up. |

### First-time setup (Windows)

1. Install [Node 22 LTS](https://nodejs.org/), [Docker Desktop](https://www.docker.com/products/docker-desktop/) and [VS Code](https://code.visualstudio.com/).
2. Clone the repo and install:
   ```powershell
   git clone https://github.com/TravisFriday/system-design-builds
   cd system-design-builds/rate-limiter
   npm install
   copy .env.example .env
   docker compose up -d
   ```
3. Run `npm test`. You should see every test fail with `TODO: implement ...`. That's your starting line.

## Milestones

Work in order. Each milestone has its own tests, so filter to just those with `--test-name-pattern`.

| # | Build | File | Run |
| --- | --- | --- | --- |
| 1a | Fixed window | `src/algorithms/fixed-window.ts` | `npm test -- --test-name-pattern="fixed window"` |
| 1b | Token bucket | `src/algorithms/token-bucket.ts` | `npm test -- --test-name-pattern="^token bucket"` |
| 1c | Sliding window log | `src/algorithms/sliding-window-log.ts` | `npm test -- --test-name-pattern="^sliding window log"` |
| 1d | Sliding window counter | `src/algorithms/sliding-window-counter.ts` | `npm test -- --test-name-pattern="sliding window counter"` |
| 2a | The wrong way: GET then SET | `src/redis/naive-counter.ts` | `npm test -- --test-name-pattern="naive"` |
| 2b | Token bucket in Redis (Lua) | `src/redis/token-bucket.ts` | `npm test -- --test-name-pattern="redis token bucket"` |
| 2c | Sliding log in Redis (sorted set + Lua) | `src/redis/sliding-window-log.ts` | `npm test -- --test-name-pattern="redis sliding log"` |
| 3 | HTTP middleware (429 + RateLimit headers) | `src/middleware.ts` | `npm test -- --test-name-pattern="middleware"` |
| 4 | Fail open when Redis is down | `src/fail-open.ts` | `npm test -- --test-name-pattern="fail-open"` |
| 5 | Benchmark and write-up | `bench/run.ts` (done) + this README | see below |

Milestone 1 tests use a fake clock, so they're instant and deterministic. Milestone 2 onwards needs Redis running.

Try the server by hand at any point after milestone 3:

```powershell
npm start                                   # memory store, token bucket, 100 per minute
curl -i -H "x-api-key: me" http://localhost:3000/api
```

Switch store and algorithm with env vars: `STORE=redis ALGO=sliding-log LIMIT=10 WINDOW_MS=1000` (in PowerShell, `$env:STORE="redis"` first).

### Milestone 5: measure it

Run each of these and paste the tables below:

```powershell
npm run bench -- --store memory --instances 3
npm run bench -- --store redis  --instances 3
npm run bench -- --store redis  --algo naive
```

With 3 servers, the memory store should let roughly 3x the limit through (each server has its own bucket), Redis should land close to 1x, and the naive counter should overshoot badly. If your numbers say otherwise, that's a bug worth finding.

## Write-up (fill this in as you go)

This section is what an interviewer reads. Keep it short and specific.

### Requirements
<!-- Who is limited (API key? IP? user?), what limits, what happens when limited, latency budget. -->

### Algorithm choice
<!-- Table: algorithm, memory per key, burst behaviour, accuracy. Which did you pick as the default and why? -->

### Distributed design
<!-- Diagram. Why Lua? Which clock does the script use and why? How do idle keys expire? -->

### Failure modes
<!-- Redis down, Redis slow, hot keys, clock skew. Fail open vs fail closed. -->

### Results
<!-- Paste the three benchmark tables. -->

### What I'd do next
<!-- e.g. Redis Cluster (hash tags), per-route rules from config, sliding counter in Redis, a Go rewrite. -->

## Stuck?

Ask Claude for a hint about the concept rather than the code. A reference solution exists in the job-search project files (`system-design/solutions/rate-limiter`), so check it only after you've passed the tests or you're truly stuck.
