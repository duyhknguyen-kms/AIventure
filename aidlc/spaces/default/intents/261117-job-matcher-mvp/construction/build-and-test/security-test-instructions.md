# Security Test Instructions

**Scope:** express — Minimal strategy. Key security properties verified:

## Verified in automated tests

| Property | Test |
|----------|------|
| `HIMALAYAS_API_KEY` never logged or included in URLs | `sources.himalayas.test.ts` |
| `GROQ_API_KEY` never returned to the browser | `ChatWidget.test.tsx` (API route proxies; key stays server-side) |
| `/api/parse-cv` rejects files > 5 MB | `CVUpload.test.tsx` |
| `/api/parse-cv` rejects unsupported MIME types | `CVUpload.test.tsx` |
| `/api/jobs` validates `q` length (max 100) → 400 | `route.jobs.test.ts` |
| `descriptionHtml` never rendered with `dangerouslySetInnerHTML` | Construction phase rule; `JobDetailPanel` uses `descriptionText` only |
| No credentials in source code | Checked during code review |

## Manual checks

- Confirm `.env.local` is in `.gitignore` before committing.
- Confirm no `NEXT_PUBLIC_` prefix on `HIMALAYAS_API_KEY`, `CACHE_TTL_SECONDS`, `HIMALAYAS_MAX_PAGES`, or `GROQ_API_KEY`.
