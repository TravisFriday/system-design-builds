# System Design Builds

Small, runnable implementations of classic system design interview problems. Each folder is a self-contained project: scaffolding and tests first, then the implementation, then a README covering requirements, the design, the trade-offs, and measured results.

| Build | Status | Covers |
| --- | --- | --- |
| [Rate limiter](rate-limiter/) | Scaffolded, building | Token bucket, sliding window, Redis + Lua atomicity, distributed limiting |
| URL shortener | Planned | ID generation, caching, redirects |
| Chat with WebSockets | Planned | Fan-out, presence, message storage |
| Job scheduler | Planned | Queues, retries, idempotency |
| Distributed cache | Planned | Consistent hashing, eviction, replication |
