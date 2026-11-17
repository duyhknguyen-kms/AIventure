# Integration Test Instructions

**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17  
**Strategy:** Minimal (scope: express)

## Automated integration tests (already in suite)

The following test files exercise integration boundaries without network calls
(adapters tested against recorded fixtures via `vi.stubGlobal("fetch", ...)`):

| Test file | Integration boundary tested |
|---|---|
| `aggregate.test.ts` | Sources → dedupe → sort pipeline |
| `route.jobs.test.ts` | Aggregator → HTTP route handler |
| `sources.himalayas.test.ts` | Zod schema → normalization → `Job` shape |
| `sources.remotive.test.ts` | Zod schema → normalization → `Job` shape |

## Manual integration check (dev server)

```bash
cd web && npm run dev

# Verify full pipeline — both sources, dedupe, cache
curl http://localhost:3000/api/jobs | python3 -m json.tool | head -30

# Verify q= search upstream
curl "http://localhost:3000/api/jobs?q=react" | python3 -m json.tool | head -20

# Verify second call is cached
curl http://localhost:3000/api/jobs | python3 -m json.tool | grep '"cached"'
```

Expected: `"cached": true` on second call within the 6 h TTL window.

## End-to-end demo walkthrough

1. Open http://localhost:3000
2. Type "react" in Skills → chips appear, cards re-rank
3. Set Min salary 100000 USD → low-salary cards disappear into "excluded"
4. Click "Show excluded (n)" → excluded cards listed with reason
5. Click any card → detail panel opens, score breakdown shows factor table
6. Click Apply → official job URL opens in new tab
7. Press Escape → panel closes, focus returns to card
8. Click "Scan CV" → upload a PDF/DOCX → preview dialog
9. Confirm CV items → criteria updated
10. Click Reset criteria → confirm dialog → all fields clear
