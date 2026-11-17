# AIventure — Post-MVP Improvement Plan

> Created: 2026-11-17  
> All 4 items implemented and tested.

---

## Status

| # | Item | Effort | Priority | Status | Tests added |
|---|------|--------|----------|--------|-------------|
| 1 | Filter function fixes | Small (1–2 h) | 🔴 High | ✅ Done | 21 |
| 2 | Pagination (10 cards/page) | Small (1 h) | 🟡 Medium | ✅ Done | 8 |
| 3 | Highlight matched criteria | Medium (2–3 h) | 🟡 Medium | ✅ Done | 9 |
| 4 | CV / Resume scan → auto-fill | Large (4–6 h) | 🟢 Low | ✅ Done | 17 |

---

## Item 1 — Filter function fixes ✅

### Bugs fixed

#### 1a — COUNTRY_REGION map expanded (was HIGH severity)
**Problem:** `COUNTRY_REGION` in `filters.ts` covered only ~40 countries. Users in Africa, Middle East, or most of Asia got wrong F1 results for region-restricted jobs.

**Fix:** Created `src/lib/normalize/countries.ts` as a single shared module for both the country-name→alpha2 map (~100 entries) and the alpha2→region map (now includes AFRICA, MIDDLE_EAST, ASIA in addition to EUROPE, AMERICAS, APAC). Both `location.ts` and `filters.ts` import from it.

#### 1b — `company` missing from `haystack()` (was MEDIUM severity)
**Problem:** `haystack()` joined `title + tags + categories + descriptionText` but not `company`. A keyword like `"stripe"` scored 0 on a job where `company = "Stripe"`.

**Fix:** Added `job.company` to `haystack()` in both `filters.ts` and `score.ts`.

#### 1c — Salary exclusion reason showed raw units (was LOW/UX)
**Problem:** Exclusion message showed `"6000 USD < 80000 USD"` — the 6000 was monthly (not annualised), making the comparison confusing.

**Fix:** Message now shows annualised figures: `"USD 72,000/yr (annualised) < USD 80,000/yr"`.

#### 1d — Country name map too small (was MEDIUM severity)
**Problem:** `COUNTRY_NAME_MAP` had ~50 entries. Himalayas returns 190+ country names. Unknown names were silently dropped → `location.countries = []`.

**Fix:** Expanded `COUNTRY_NAME_MAP` to ~100 entries in `countries.ts`. Added alpha-2 passthrough: a 2-letter string is returned as-is (already a valid code).

#### 1e — Hyphenated excluded keywords missed space-separated variants (was MEDIUM)
**Problem:** Excluding `"on-site"` built regex `\bon-site\b`. This matches the hyphenated form but not `"on site"` (two words, no hyphen).

**Fix:** Both the excluded keyword and the haystack are normalised (hyphens → spaces) before regex matching. Applied in both `filters.ts` and `score.ts` for consistency.

### Files changed
- `src/lib/normalize/countries.ts` (**new**) — unified country + region maps
- `src/lib/normalize/location.ts` — imports from `countries.ts`
- `src/lib/matching/filters.ts` — all 5 fixes applied
- `src/lib/matching/score.ts` — haystack + hyphen fixes

---

## Item 2 — Pagination ✅

### What was built
`JobList` now shows max 10 cards per page. MUI `Pagination` appears below the list when there are more than 10 results.

### Key behaviour
- Page resets to 1 whenever `ranked` changes (new criteria, sort change, or refresh)
- Sort dropdown change also resets to page 1
- Page change scrolls `#main` into view so keyboard users don't get lost
- `onAnnounce` callback fires `"Page 2 of 7, showing jobs 11–20"` → `LiveAnnouncer`
- `showFirstButton` / `showLastButton` on the Pagination component for large lists

### Files changed
- `src/components/JobList.tsx` — `PAGE_SIZE = 10`, `page` state, `useEffect` reset, `Pagination`, `onAnnounce` prop

---

## Item 3 — Highlight matched criteria ✅

### What was built
A new `HighlightText` component wraps matched terms in `<mark>` elements with background + bold weight (never colour alone — WCAG 1.4.1).

### Where highlights appear
| Location | Terms highlighted |
|---|---|
| `JobCard` title | `keywords` + `targetTitles` (primary colour) |
| `JobDetailPanel` description | `keywords` + `targetTitles` (primary) + `excludedKeywords` (error/red) |

### Technical details
- Same word-boundary + hyphen-normalisation as the matching engine — highlights always match what actually scored
- Sorted longest-first to prefer longer matches over shorter overlapping ones
- Visually-hidden `"Contains highlighted matches."` prefix for screen readers that don't announce `<mark>`
- `<mark>` uses `bgcolor: warning.light` (primary matches) or `bgcolor: error.light` (excluded terms)

### Files changed
- `src/components/HighlightText.tsx` (**new**)
- `src/components/JobCard.tsx` — title wrapped
- `src/components/JobDetailPanel.tsx` — description wrapped with 3 term lists
- `src/app/page.tsx` — threads all 3 term lists from criteria

---

## Item 4 — CV / Resume scan → auto-fill ✅

### What was built
A "Scan CV" button at the top of `CriteriaForm` opens a file picker. The selected PDF or DOCX is parsed **client-side** (file never leaves the browser). Extracted results are shown in a preview Dialog with checkboxes. On confirm, the user's selections are merged into existing criteria.

### File parsing
| Format | Library | Bundle impact |
|---|---|---|
| PDF | `pdfjs-dist` (Mozilla PDF.js) | Lazy-imported; not in initial bundle |
| DOCX | `mammoth` | Lazy-imported; not in initial bundle |

### Extraction heuristics
| Field | Method |
|---|---|
| `keywords` | Match extracted text against ~120-entry skills dictionary (word boundary) |
| `targetTitles` | Explicit label patterns (`"Title: ..."`) + lines near date ranges that contain role keywords |
| `seniority` | Same regex as `inferSeniorityFromTitle`; also infers from years-of-experience mentions |

### Merge policy
`mergeExtracted()` appends to existing criteria arrays using `Set` deduplication — existing values are never replaced. Salary, country, timezone, and benefit preferences are untouched.

### Edge cases handled
- File > 5 MB → error shown before parsing
- Scanned/image-only PDF → empty text → specific error message
- Encrypted PDF → caught with generic error
- Unknown file extension → rejected with format error
- No signals found → "nothing found" state shown in dialog

### Files changed
- `src/lib/cv/parseCv.ts` (**new**)
- `src/lib/cv/extractCriteria.ts` (**new**)
- `src/lib/cv/skills-dictionary.ts` (**new**)
- `src/components/CvScanner.tsx` (**new**)
- `src/components/CriteriaForm.tsx` — `CvScanner` added at top

---

## Future improvements (not yet planned)

| Idea | Notes |
|---|---|
| Search bar in AppBar | Pass `q` to `/api/jobs` for Himalayas upstream search; Remotive already filtered locally |
| Save multiple criteria profiles | Key per profile in localStorage; switch from a dropdown |
| Job freshness indicator | Show "posted X days ago" relative to `publishedAt` |
| More job sources | The adapter pattern makes it straightforward to add a third source |
| Export matches | Download ranked jobs as CSV for offline review |
