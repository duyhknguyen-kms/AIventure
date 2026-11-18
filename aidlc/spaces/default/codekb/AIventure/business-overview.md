# Business Overview — AIventure

## Product Summary

AIventure is a remote-job matching and recommendation platform. It aggregates job listings from two public APIs (Himalayas and Remotive), normalises them into a single data model, scores every listing deterministically against user-supplied criteria, and renders a ranked dashboard. All matching and benefit analysis runs with no AI/LLM dependency; the scoring algorithm is a pure, weighted, 7-factor function.

## Target Users

Remote-work job-seekers who want to:

- Filter and rank a large pool of listings against personal preferences (skills, seniority, salary floor, location eligibility, timezone overlap, employment type, and desired benefits) without sending their CV to a third-party service.
- Upload a CV (PDF or DOCX) to auto-populate their skills and seniority preferences entirely in-browser — the file never leaves the client.

## Core Value Proposition

| Dimension | Value |
|-----------|-------|
| Multi-source coverage | Combines Himalayas (structured, paginated, up to 100 jobs) and Remotive (full public feed) in one view, deduplicating cross-source listings and crediting both sources. |
| Transparent matching | Every job carries a 0–100 match percentage with a per-factor breakdown (skills, title, seniority, salary, employment type, timezone, benefits). Users see exactly why a job scored what it did. |
| Hard-filter + soft-score separation | Location eligibility, excluded keywords, and salary floor are hard gates (a job either passes or is hidden with a reason). The remaining seven factors are soft scores, weighted and renormalised across only the active factors. |
| Privacy-first CV parsing | PDF and DOCX parsing happens entirely in the browser using dynamically-imported pdfjs-dist and mammoth. No server ever receives the file. |
| Benefit detection with evidence | Nine benefit categories are detected via a regex dictionary over the job description. Each detected benefit carries up to two 120-character evidence snippets so users can verify the claim. |
| WCAG 2.2 AA | The entire UI was built against WCAG 2.2 Level AA. This includes skip links, polite live regions for screen readers, `<mark>`-based keyword highlighting (never colour alone), fieldset/legend labelling, and an axe-core automated test suite. |

## Product Goals (implemented MVP)

| ID | Goal | Status |
|----|------|--------|
| G1 | Ingest and normalise jobs from Himalayas and Remotive into one `Job` model | ✅ |
| G2 | Score every job 0–100 with a per-factor breakdown and detected benefits | ✅ |
| G3 | WCAG 2.2 AA dashboard: ranked jobs, match %, salary, benefits, source attribution | ✅ |
| G4 | Filter fixes (expanded country/region maps, hyphen normalisation, company in haystack) | ✅ |
| G5 | Pagination (10 cards/page with keyboard-accessible page announcements) | ✅ |
| G6 | Keyword and title highlighting in job cards and detail panel | ✅ |
| G7 | Client-side CV scan with heuristic skill/title/seniority extraction and user-confirmation dialog | ✅ |

## Explicit Non-Goals (MVP)

- No AI / LLM matching (explicitly marked as a future phase in SPEC.md §15).
- No authentication or user accounts.
- No database — criteria in `localStorage`, jobs in in-memory server cache.
- No HTML scraping — only official public JSON APIs.
- No currency conversion, job-alert emails, or redistribution of job data.

## Business Constraints

- **Himalayas ToS:** apply links must go to `applicationLink` (not a redirect); usage keyed to `HIMALAYAS_API_KEY` is capped at 60 req/min / 10,000/day.
- **Remotive ToS:** no gating listings behind sign-up; maximum ~4 requests per day; full feed must be fetched once per cache window without a `search` parameter.
- Both constraints are encoded in the aggregation layer: a 6-hour server-side TTL cache prevents excessive upstream calls.

## Phased Enhancement Intent (next)

The next intent ("261118-ai-job-enhancement") extends the MVP with:
1. Improved CV parsing — better accuracy, possible LLM-assisted extraction.
2. AI-assisted matching — replace or augment the deterministic scorer with an LLM-based relevance model.
3. QA validation layer — systematic quality assurance of matching output, possibly with property-based tests or golden datasets.
