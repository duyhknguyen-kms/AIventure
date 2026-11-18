# Scope Document — AIventure

**Intent:** 261117-job-matcher-mvp  
**Scope type:** MVP  
**Date:** 2026-11-17  
**Status:** Delivered ✅

## Sources

Initial description: An intelligent job search and matching platform that removes the hassle
of manually browsing multiple recruitment sites. The system automatically aggregates job listings
across diverse web sources, analyzing requirements and benefits against user-defined criteria to
surface the highest-matching opportunities.

Workflow-selected scope: `express` (PoC MVP, 2-day target)

## Problem Statement

Remote job seekers must manually visit multiple job boards, read dozens of descriptions, and
mentally match each listing against their own skills, salary needs, timezone, and benefit
preferences. This is time-consuming, inconsistent, and easy to get wrong.

**Core outcome:** A job seeker opens one URL and immediately sees remote jobs ranked by how
well they fit the seeker's personal criteria — without reading every description.

## Personas

**Primary — The Remote Job Seeker**
- Role: Developer or knowledge worker seeking a fully remote position
- Goals: Find relevant remote jobs quickly; understand why a job ranks where it does; apply directly without leaving the aggregator
- Pain points: Duplicate listings across boards; salary not listed or in inconsistent formats; location restrictions hidden deep in descriptions
- Tech comfort: High
- Frequency: Weekly active searches during a job hunt

**Secondary — The Accessibility-Focused User**
- Role: Same as primary, with reliance on keyboard navigation or screen reader
- Goals: Use the full app without a mouse; have live updates announced
- Constraint: Every interactive element must be keyboard-reachable with a visible focus ring

## In Scope (Delivered)

### Data layer
- Himalayas API adapter: cursor-paginated browse + search, Zod-validated, normalized to `Job`
- Remotive API adapter: full feed, Zod-validated, normalized to same `Job` shape
- Deduplication by `norm(company) + "|" + norm(title)`; Himalayas wins; duplicate credited via `alsoOn`
- TTL cache (6 h) on `globalThis` with in-flight dedupe, stale-on-error, and 429 blocking
- `GET /api/jobs` route: Zod-validated `q` param, 200 / 400 / 502 responses

### Normalisation
- Employment type (Full Time → `full_time`, etc.)
- Seniority (Himalayas labels + Remotive title inference)
- Timezone (number and string forms)
- HTML stripping (entity decode, whitespace collapse)
- Country name → ISO alpha-2 (~100 countries); alpha-2 → region (EUROPE / AMERICAS / APAC / AFRICA / MIDDLE_EAST / ASIA)
- Salary free text → structured `{min, max, currency, period, annualMin, annualMax}`

### Matching engine (pure, browser-side)
- Hard filter F1: location (worldwide / country / region / uncertain)
- Hard filter F2: excluded keywords (word-boundary + hyphen-normalised)
- Hard filter F3: salary floor (annualMax < floor, same currency)
- 7-factor weighted score: skills (30), title (20), salary (15), benefits (15), seniority (10), employment (5), timezone (5)
- Benefit detection: 9 benefit types from description regex dictionary with evidence snippets
- Inactive factors excluded from denominator (empty criteria → 100%, sorted by recency)

### UI
- Paginated job list (10/page), sort by match % / newest / salary
- Match badge hidden when no criteria are active
- Job card: Avatar initials fallback, match badge (number + text + colour), benefit chips, source attribution
- Criteria form: chip Autocomplete (keywords / titles / excluded), seniority + employment checkboxes (fieldset + legend), salary + currency, country, UTC offset, benefit must-haves / nice-to-haves, Reset with confirmation
- CV scanner: client-side PDF/DOCX parse → skills + titles + seniority → preview dialog with checkboxes → merge into criteria
- Job detail panel: score breakdown table, benefit evidence blockquotes, plain-text description, Apply link (official URL, new tab)
- Highlight matched terms in card title and detail description; excluded keywords in red
- localStorage persistence with Zod validation; 300 ms debounce
- Responsive: sidebar on desktop (≥ md), Drawer on mobile
- WCAG 2.2 AA: skip link, `role="status"` live region, `role="alert"` for failures, `prefers-reduced-motion`

## Out of Scope (This Release)

| Capability | Reason deferred |
|---|---|
| Authentication / user accounts | Not required for PoC; criteria in localStorage per-device |
| AI/LLM-based scoring | Explicitly deferred — matching is deterministic (§15 of SPEC) |
| More job sources (LinkedIn, Indeed, etc.) | Requires auth/scraping, out of Remotive terms |
| Google Jobs / JobPosting structured data | Prohibited by API terms |
| Email capture or sign-up prompts | Prohibited by Remotive terms |
| Push / browser notifications | Nice-to-have, not core to discovery loop |
| Server-side rendered job pages for SEO | Overly complex for a PoC |
| Employer CRM / saved applications | Out of scope for a job aggregator |
| RSS / JSON feed for third parties | Prohibited by API terms |

## Constraints

- **Himalayas API:** 60 req/min (keyed), shared public (unkeyed). Cache prevents excess calls.
- **Remotive API:** ~4 req/day advisory. Full feed fetched once per 6 h cache window; `q` filtered locally.
- **No database:** Criteria live in browser `localStorage`; jobs cached in server memory per process.
- **No AI/LLM calls:** All scoring is deterministic regex/math.
- **API keys server-side only:** `HIMALAYAS_API_KEY` never in client code, URLs, or logs.

## Success Metrics

| Metric | Target | Measurement |
|---|---|---|
| Time to first useful result | < 3 s on first load | Browser DevTools network waterfall |
| Match badge accuracy | §7.5 golden test = 88% | Automated unit test |
| Accessibility | 0 axe violations (jsdom) | `npm test` a11y suite |
| Test coverage | ≥ 289 passing tests | `npm test` |
| TypeScript errors | 0 | `npx tsc --noEmit` |
| API terms compliance | All checklist items ticked | PROGRESS.md compliance section |

## Current Status

All 16 user stories delivered. 289 tests passing. 0 TypeScript errors. 0 axe violations.

See `PROGRESS.md` for the full 12-stage delivery log.
