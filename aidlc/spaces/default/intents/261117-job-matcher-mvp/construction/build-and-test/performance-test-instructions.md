# Performance Test Instructions

**Scope:** express — no NFR performance targets defined for this scope.

Informal targets for a healthy local run:

| Metric | Target |
|--------|--------|
| `GET /api/jobs` (cache hit) | < 50 ms |
| `GET /api/jobs` (cold, both sources) | < 15 s |
| Client re-rank on criteria change | < 50 ms (browser, synchronous) |
| `npm test` suite | < 30 s |

These are observational; no automated perf gate runs in CI for this scope.
