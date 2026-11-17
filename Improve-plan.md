# AIventure — Post-MVP Improvement Plan

> Status: Planning  
> Created: 2026-11-17  
> Based on: completed 8-stage MVP (215 tests, zero TS errors)

---

## Improvement Overview

| # | Item | Effort | Priority | Status |
|---|------|--------|----------|--------|
| 1 | Filter function fixes | Small (1–2 h) | 🔴 High | ✅ Done |
| 2 | Pagination (10 cards/page) | Small (1 h) | 🟡 Medium | ✅ Done |
| 3 | Highlight matched criteria | Medium (2–3 h) | 🟡 Medium | ✅ Done |
| 4 | CV / Resume scan → auto-fill | Large (4–6 h) | 🟢 Low | ✅ Done |

Implement in this order: 1 → 2 → 3 → 4.

---

## Item 1 — Filter function fixes

### Background
Code review of `filters.ts`, `score.ts`, and `normalize/location.ts` found
six issues. Four need a fix; one is a UX improvement; one was confirmed not
a bug.

### Bug 1a — `COUNTRY_REGION` map is incomplete (HIGH)

**File:** `src/lib/matching/filters.ts`

**Problem:** The `COUNTRY_REGION` lookup table covers only ~40 countries.
Users whose country code is not in the table (e.g. `"EG"`, `"KE"`, `"NG"`,
`"PK"`, `"MA"`) get `userRegion = undefined`. This means `inRegions` is
always false for those users, so region-restricted jobs (e.g. `regions: ["EUROPE"]`)
are never kept by the region path — only exact country matches work.

**Fix:** Expand `COUNTRY_REGION` to cover every country present in
`COUNTRY_NAME_MAP` in `normalize/location.ts` (~60 entries). The two tables
must stay in sync; extract both into a shared `src/lib/normalize/countries.ts`
module so they cannot drift.

---

### Bug 1b — `haystack()` omits `company` field (MEDIUM)

**Files:** `src/lib/matching/filters.ts`, `src/lib/matching/score.ts`

**Problem:** `haystack(job)` joins `title + tags + categories + descriptionText`
but not `company`. A user keyword of `"stripe"` or `"google"` never scores,
even though the company name is the most visible field.

The aggregate-layer `matchesQuery` function in `aggregate.ts` *does* include
`company`, creating an inconsistency: the API search surface is broader than
the client scoring surface.

**Fix:** Add `job.company` to `haystack()` in both `filters.ts` and `score.ts`.

---

### Bug 1c — Hyphenated excluded keywords miss space-separated variants (MEDIUM)

**File:** `src/lib/matching/filters.ts`

**Problem:** Excluding `"on-site"` builds the regex `\bon-site\b`. This matches
the hyphenated form but not `"on site"` (two words, no hyphen), because `-`
is a non-word character — `\b` fires at the hyphen boundary, so `on` and `site`
are treated as separate tokens.

A job description saying `"This role is on site"` would survive the filter
even though the user clearly wants to exclude on-site work.

**Fix:** Before building the regex, normalise both the keyword and the haystack:
replace `-` with a space. Apply the same normalisation to multi-word keywords
in `score.ts` for consistency.

---

### Bug 1d — Himalayas location: unknown country names silently dropped (MEDIUM)

**File:** `src/lib/normalize/location.ts`, `src/lib/sources/himalayas.ts`

**Problem:** `countryNameToAlpha2` maps only ~50 countries. Himalayas supports
190+. If the API returns `"Pakistan"` or `"Romania"`, `countryNameToAlpha2`
returns `null` and the country is silently dropped from `location.countries`.

The job ends up `worldwide: false, countries: []` which triggers the
"unparseable" keep-all path in F1 — so no jobs are incorrectly excluded —
but the location display on the card and in the detail panel is empty.

**Fix:** Expand `COUNTRY_NAME_MAP` to cover the full ISO 3166 country list.
Add a defensive fallback: if the string is exactly 2 upper-case letters
(already an alpha-2 code), use it directly without a lookup.

---

### UX fix 1e — Salary exclusion reason shows raw values, not annualised (LOW)

**File:** `src/lib/matching/filters.ts`

**Problem:** The exclusion reason for F3 reads:
`"Salary below floor: 6000 USD < 80000 USD"`.
The `6000` is the monthly `annualMax` (not annualised), while `80000` is the
user's annual floor. The mismatch in units is confusing.

**Fix:** Show annualised figures in the reason string:
`"Salary below floor: USD 72,000/yr (annualised) < USD 80,000/yr"`.

---

### Not a bug — 1f (confirmed safe)

**Remotive "USA timezones" double-entry**: the token `"USA timezones"` contains
the word `timezone`, so the `/timezone/i` skip fires correctly. No action needed.

---

### Files to change for Item 1

| File | Change |
|---|---|
| `src/lib/normalize/countries.ts` | **New** — shared country-name → alpha-2 + alpha-2 → region maps |
| `src/lib/normalize/location.ts` | Import from `countries.ts`; expand map; add alpha-2 passthrough |
| `src/lib/matching/filters.ts` | Import region map from `countries.ts`; add `company` to `haystack`; normalise hyphens; fix exclusion reason string |
| `src/lib/matching/score.ts` | Add `company` to `haystack`; normalise hyphens in term matching |
| Tests to update | `tests/normalize.test.ts`, `tests/filters.test.ts`, `tests/score.test.ts` |

---

## Item 2 — Pagination (max 10 cards per page)

### What it does
`JobList` shows 10 cards per page. MUI `Pagination` lets the user navigate.
Page resets to 1 on criteria change, sort change, or data refresh.

### Changes

**`src/components/JobList.tsx`**
- Add `PAGE_SIZE = 10` constant.
- Add `page` state (1-based integer).
- Add `useEffect(() => setPage(1), [ranked])` to reset on new results.
- Slice `sorted` as `sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)`.
- Render MUI `Pagination` below the list with `count={Math.ceil(sorted.length / PAGE_SIZE)}`.
- Pass page-change message to `LiveAnnouncer`:
  `"Page {page} of {total}, showing jobs {start}–{end}"`.

### Accessibility
- MUI `Pagination` has correct ARIA by default (`nav` landmark, `aria-label`
  on each page button).
- Scroll to top of `#main` on page change so keyboard users don't get lost.
- `LiveAnnouncer` polite announcement covers screen reader users.

### Edge cases
- Less than 10 results → `Pagination` renders a single page (or is hidden).
- Criteria change → `useEffect` resets `page` to 1 before the new slice runs.
- Sort change → same reset.

---

## Item 3 — Highlight matched criteria in cards and detail panel

### What it does
Wraps matched terms in `<mark>` so users instantly see why a job scored well.

| Location | Terms highlighted |
|---|---|
| `JobCard` title | `keywords` + `targetTitles` matches |
| `JobDetailPanel` description | `keywords` + `targetTitles` (primary) + `excludedKeywords` (red warning) |

### New component — `src/components/HighlightText.tsx`

```
Props:
  text: string
  terms: string[]           // highlighted in primary colour
  warnTerms?: string[]      // highlighted in error colour (excluded keywords)
```

Logic:
1. Build a combined regex from all `terms` using the same `\b` + escaping
   logic as `filters.ts` (share the `escapeRegex` utility).
2. Split `text` into alternating plain/highlighted segments.
3. Render plain segments as text nodes; highlighted segments as
   `<mark style={{ backgroundColor: ... }}>`.
4. `warnTerms` get a separate pass with error colour.

### Accessibility notes
- `<mark>` has an implicit role of `mark` but is not reliably announced.
  Wrap the first highlighted word in a paragraph with a visually-hidden
  prefix: `<span className="sr-only">Matched: </span>` before the first mark.
- Use background colour + underline or bold weight (not colour alone) to
  satisfy WCAG 1.4.1.

### Files to change

| File | Change |
|---|---|
| `src/components/HighlightText.tsx` | **New** component |
| `src/components/JobCard.tsx` | Wrap title with `HighlightText`; pass `keywords + targetTitles` |
| `src/components/JobDetailPanel.tsx` | Wrap description text with `HighlightText`; pass all three term lists |
| `src/app/page.tsx` | Pass `criteria.keywords`, `criteria.targetTitles`, `criteria.excludedKeywords` down to `JobList` → `JobCard` / `JobDetailPanel` |

---

## Item 4 — CV / Resume scan → auto-fill criteria

### What it does
User uploads a PDF or DOCX file. The app extracts text client-side (no server
upload), parses it for skills, job titles, and seniority, then pre-populates
the CriteriaForm. User reviews a preview before applying.

### Client-side only (privacy-first)
The file never leaves the browser. No server endpoint, no storage. This avoids
GDPR concerns and infrastructure cost.

### Parsing libraries
| Format | Library | Bundle size |
|---|---|---|
| PDF | `pdfjs-dist` (Mozilla PDF.js, WebWorker) | ~300 kB (lazy-loaded) |
| DOCX | `mammoth` (HTML/text extraction) | ~140 kB (lazy-loaded) |

Both are dynamically imported (`import()`) so they don't affect the initial
page load.

### Extraction heuristics (`src/lib/cv/extractCriteria.ts`)

| Field | Heuristic |
|---|---|
| `keywords` | Match extracted text against a skills dictionary (can seed from common tech terms: react, typescript, python, etc.). Every match → added to keywords. |
| `seniority` | Run `inferSeniorityFromTitle` from `normalize/seniority.ts` on each job title line found in the CV. |
| `targetTitles` | Extract job title lines from work experience blocks (look for lines following `"Position:"`, `"Title:"`, or capitalised role names near date ranges). |

### UI flow

1. "Scan CV" button at top of CriteriaForm opens a file-picker (`accept=".pdf,.docx"`).
2. While parsing: spinner with `aria-live="polite"` progress message.
3. After parsing: preview Dialog lists extracted skills, titles, seniority
   with checkboxes — user can deselect anything.
4. On confirm: extracted values are merged (appended) into existing criteria.
   Existing criteria are never erased.

### Edge cases to handle
| Case | Handling |
|---|---|
| Encrypted / scanned PDF (image-only) | Surface error: "Could not read text from this PDF. Try a text-based version." |
| File > 5 MB | Warn before processing: "This file is large. Processing may take a moment." |
| Non-English CV | Skills (mostly English tech terms) still work. Job titles may not match — user can edit the preview. |
| Browser without File API | Degrade gracefully: hide the button if `window.FileReader` is undefined. |

### New files

| File | Purpose |
|---|---|
| `src/lib/cv/parseCv.ts` | PDF/DOCX → plain text (wraps pdfjs-dist / mammoth, dynamically imported) |
| `src/lib/cv/extractCriteria.ts` | Plain text → `Partial<Criteria>` |
| `src/lib/cv/skills-dictionary.ts` | Static list of common tech skills for matching |
| `src/components/CvScanner.tsx` | File-drop + spinner + preview Dialog |

### Dependencies to add
```bash
npm install pdfjs-dist mammoth
```

---

## Implementation checklist

### Item 1 — Filter fixes
- [ ] Create `src/lib/normalize/countries.ts` with unified country + region maps
- [ ] Update `location.ts` to import from `countries.ts`
- [ ] Update `filters.ts`: expand COUNTRY_REGION, add `company` to haystack, normalise hyphens, fix salary reason
- [ ] Update `score.ts`: add `company` to haystack, normalise hyphens
- [ ] Update `normalize.test.ts`, `filters.test.ts`, `score.test.ts`
- [ ] `npm test` — all pass

### Item 2 — Pagination
- [ ] Update `src/components/JobList.tsx`: add `PAGE_SIZE`, `page` state, `Pagination`, `LiveAnnouncer` message, page reset
- [ ] `npm test` — all pass

### Item 3 — Highlight text
- [ ] Create `src/components/HighlightText.tsx`
- [ ] Update `JobCard.tsx`
- [ ] Update `JobDetailPanel.tsx`
- [ ] Update `page.tsx` to thread term props
- [ ] `npm test` — all pass

### Item 4 — CV scan
- [ ] `npm install pdfjs-dist mammoth`
- [ ] Create `src/lib/cv/parseCv.ts`
- [ ] Create `src/lib/cv/extractCriteria.ts`
- [ ] Create `src/lib/cv/skills-dictionary.ts`
- [ ] Create `src/components/CvScanner.tsx`
- [ ] Add "Scan CV" button to `CriteriaForm.tsx`
- [ ] `npm test` — all pass
