# Performance Test Instructions

**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17  
**Strategy:** Minimal (PoC scope — no load testing required)

## NFR targets from requirements

| NFR | Target | Verification method |
|---|---|---|
| Initial page load | < 3 s (data fetch included) | Chrome DevTools Network tab |
| Re-rank on criteria change | < 50 ms (pure, browser-side) | Chrome DevTools Performance tab |
| Cache hit response time | < 50 ms (no upstream call) | `curl` with timing |

## Informal verification (dev server)

```bash
# Time a cache hit
time curl -s http://localhost:3000/api/jobs > /dev/null

# Expect: < 100 ms real time on a cache hit
```

**Client-side re-rank:** `rankJobs(117 jobs, criteria)` completes in < 1 ms on a modern laptop
(pure arithmetic + regex, no I/O). Verified informally via browser console `console.time`.

## Notes

- No external load testing tool required for this PoC scope.
- If the app is deployed, Lighthouse performance score should be ≥ 70 on the initial load.
- The main performance constraint is the upstream APIs (Himalayas ~200–800 ms, Remotive ~200–500 ms on a cold cache); both are hidden by the 6 h TTL cache after first load.
