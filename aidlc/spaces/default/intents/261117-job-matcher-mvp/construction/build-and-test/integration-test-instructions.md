# Integration Test Instructions

**Scope:** express — Minimal strategy. No integration test floor beyond the existing route tests.

The `/api/jobs` and `/api/parse-cv` route tests in `tests/route.jobs.test.ts` cover the integration boundary between the aggregation layer and the HTTP layer. They run as part of `npm test`.

Manual integration check (run once after `npm run dev`):

```bash
# Verify both sources respond
curl "http://localhost:3000/api/jobs" | jq '.sources'

# Verify search filtering
curl "http://localhost:3000/api/jobs?q=react" | jq '{count: (.jobs | length)}'

# Verify CV parse endpoint
curl -X POST http://localhost:3000/api/parse-cv \
  -F "file=@/path/to/your-cv.pdf" | jq '{skills: .keywords[:5]}'
```
