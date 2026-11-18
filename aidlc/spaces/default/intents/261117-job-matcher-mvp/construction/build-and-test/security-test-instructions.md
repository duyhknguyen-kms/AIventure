# Security Test Instructions

**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17  
**Strategy:** Minimal (PoC scope)

## NFR4 security requirements (from requirements.md)

- API keys server-side only — never in client bundle, URLs, or logs
- Input validation at the API boundary (`q` param, Zod)
- No `dangerouslySetInnerHTML` — job descriptions rendered as plain text
- No secrets hardcoded

## Automated checks (already passing)

| Check | Mechanism | Status |
|---|---|---|
| No `dangerouslySetInnerHTML` | ESLint + code review | ✅ |
| `q` param validated (max 100 chars) | Zod in `route.ts` | ✅ `route.jobs.test.ts` |
| No hardcoded secrets | ESLint + `.env.local` gitignored | ✅ |

## Manual verification checklist

```bash
# 1. Confirm HIMALAYAS_API_KEY is not in the client bundle
cd web && npm run build
grep -r "HIMALAYAS_API_KEY" .next/static/ 2>/dev/null && echo "FAIL: key in bundle" || echo "PASS: not in bundle"

# 2. Confirm q= injection does not break the server
curl "http://localhost:3000/api/jobs?q=$(python3 -c 'print("a"*101)')"
# Expected: HTTP 400

# 3. Confirm HTML in job descriptions is never rendered as markup
# Open any job card, right-click description text in detail panel
# → View source: description should appear as text nodes, not HTML tags
```

## Notes

- No authentication surface to test (PoC has no login).
- No database to protect (in-memory cache only).
- Remotive HTML stripping (`stripHtml()`) is covered by `normalize.test.ts`.
- The CV file parsing (`parseCv.ts`) runs entirely client-side — no file upload endpoint exists.
