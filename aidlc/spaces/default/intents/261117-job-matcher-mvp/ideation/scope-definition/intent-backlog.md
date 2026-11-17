# Intent Backlog — AIventure

**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17  
**Method:** MoSCoW prioritization · RICE for ranking within tiers  
**Status:** All units delivered ✅

---

## Personas

- **P1 — Remote Job Seeker** (primary): developer or knowledge worker actively looking for a remote role
- **P2 — Accessibility-Focused User** (secondary): same as P1, relies on keyboard navigation or screen reader

---

## Must Have (M)

These are non-negotiable. The product is unusable without them.

### UNIT-01 · Multi-source job feed
**Stories:** US-01, US-02  
**Value:** Every user sees jobs the moment they land — no setup required. Without this, there is no product.  
**RICE:** Reach=100% · Impact=3 · Confidence=100% · Effort=3 → **Score: 100**  
**Delivered:** Himalayas adapter (Stages 2–3), Remotive adapter (Stage 3), dedupe + cache + API (Stage 4)  
**Key decisions:**
- Himalayas wins on deduplication (structured salary)
- Remotive full feed fetched once per 6 h cache window (4 calls/day constraint)
- Real API deviations handled: `locationRestrictions` as string[], `timezoneRestrictions` as number[]

---

### UNIT-02 · Deterministic matching engine
**Stories:** US-04, US-05, US-06, US-07, US-08  
**Value:** Transforms the feed from a list into a ranked, personalised result. Without scoring, AIventure is just another job board.  
**RICE:** Reach=100% · Impact=3 · Confidence=100% · Effort=5 → **Score: 60**  
**Delivered:** Criteria schema (Stage 5), benefit detection (Stage 5), filters F1/F2/F3 (Stage 5), 7-factor scorer (Stage 5)  
**Key decisions:**
- Inactive factors excluded from denominator (empty criteria → 100%, not 0%)
- §7.5 golden test = 88% — locks the formula
- Pure functions: runs identically on server and client, trivial to test

---

### UNIT-03 · Dashboard with job cards
**Stories:** US-01, US-03, US-13  
**Value:** The primary surface the user interacts with every session.  
**RICE:** Reach=100% · Impact=3 · Confidence=100% · Effort=3 → **Score: 100**  
**Delivered:** JobCard, JobList, sort, loading skeletons, excluded toggle (Stage 6)  
**Key decisions:**
- Match badge hidden when no criteria are active (bugfix)
- SourceAttribution outside CardActionArea (axe nested-interactive fix)
- Match level: number + text + colour (never colour alone)

---

### UNIT-04 · Criteria form with persistence
**Stories:** US-04–US-08, US-09, US-11  
**Value:** Without a way to set and save criteria, every session starts from scratch and the matching engine is never used.  
**RICE:** Reach=100% · Impact=3 · Confidence=100% · Effort=3 → **Score: 100**  
**Delivered:** CriteriaForm, useCriteria (Stage 7)  
**Key decisions:**
- Zod-validated on load; falls back to DEFAULT_CRITERIA silently
- 300 ms debounced write to localStorage
- MUI v9 API changes: `renderTags` → `renderValue`, `inputProps` → `slotProps.htmlInput`

---

## Should Have (S)

Important but the product still functions without them on first use.

### UNIT-05 · Job detail panel + score breakdown
**Stories:** US-03, US-08  
**Value:** Gives users the evidence behind a score so they can make an informed decision rather than clicking Apply blindly.  
**RICE:** Reach=80% · Impact=2 · Confidence=90% · Effort=2 → **Score: 72**  
**Delivered:** JobDetailPanel, ScoreBreakdown (Stage 8)  
**Key decisions:**
- Description as plain text only — `dangerouslySetInnerHTML` explicitly forbidden (Remotive HTML is untrusted)
- Apply uses `applyUrl` from the API, never rebuilt
- Escape key returns focus to opening card (MUI Dialog default)

---

### UNIT-06 · Source failure handling
**Stories:** US-15  
**Value:** A single-source failure silently shows fewer jobs without warning; users need to know why.  
**RICE:** Reach=20% · Impact=2 · Confidence=80% · Effort=1 → **Score: 32**  
**Delivered:** SourceStatusBanner (Stage 6), stale-on-error cache (Stage 4)  
**Key decisions:**
- Banner shown only when `ok === false` — not on normal cache hits (bugfix for false-positive banner)
- `role="alert"` via MUI Alert so failures are announced by screen readers

---

## Could Have (C)

Desirable. Included because time allowed and they increase daily usability.

### UNIT-07 · Pagination
**Stories:** US-12  
**Value:** 100+ job cards in one DOM is slow to render and hard to scan.  
**RICE:** Reach=100% · Impact=1 · Confidence=90% · Effort=0.5 → **Score: 180**  
**Delivered:** PAGE_SIZE=10, MUI Pagination, page reset on criteria/sort change (Improvement 2)

---

### UNIT-08 · Highlight matched terms
**Stories:** US-04, US-06  
**Value:** Users immediately see why a job scored well without reading the whole description.  
**RICE:** Reach=70% · Impact=1 · Confidence=80% · Effort=1 → **Score: 56**  
**Delivered:** HighlightText component, wired into JobCard + JobDetailPanel (Improvement 3)

---

### UNIT-09 · CV / Resume scan
**Stories:** US-10  
**Value:** Removes the friction of manually typing 20 skill keywords after uploading a CV.  
**RICE:** Reach=60% · Impact=2 · Confidence=70% · Effort=2 → **Score: 42**  
**Delivered:** parseCv, extractCriteria, CvScanner (Improvement 4)  
**Key decisions:**
- Client-side only (file never leaves browser) — privacy + zero infrastructure cost
- pdfjs-dist and mammoth dynamically imported (not in initial bundle)

---

### UNIT-10 · Full keyboard navigation + WCAG AA
**Stories:** US-16  
**Value:** Legal and ethical requirement. Also widens the user base.  
**RICE:** Reach=100% · Impact=1 · Confidence=100% · Effort=2 → **Score: 50**  
**Delivered:** SkipLink, LiveAnnouncer, fieldset+legend, focus management, reduced-motion (Stages 6–8)

---

## Won't Have (W)

Explicitly out of scope for this release. Documented to prevent scope creep.

| Capability | Reason |
|---|---|
| Authentication / saved profiles | Not required for PoC; localStorage is sufficient |
| AI/LLM scoring | Deferred to future phase (§15 of SPEC) |
| More job sources (LinkedIn, Indeed) | Requires auth/scraping, out of terms |
| Push notifications | Infrastructure cost, not core to discovery |
| Server-side rendered job pages | SEO overshoot for a PoC |
| Email capture / sign-up | Prohibited by Remotive API terms |
| RSS / JSON feed for third parties | Prohibited by API terms |
| JobPosting structured data | Prohibited by API terms |

---

## Delivery Summary

| Unit | Priority | Stage(s) | Stories covered |
|---|---|---|---|
| UNIT-01 Multi-source feed | M | 2, 3, 4 | US-01, US-02 |
| UNIT-02 Matching engine | M | 5 | US-04–US-08 |
| UNIT-03 Dashboard | M | 6 | US-01, US-03, US-13 |
| UNIT-04 Criteria + persistence | M | 7 | US-04–US-09, US-11 |
| UNIT-05 Detail panel | S | 8 | US-03, US-08 |
| UNIT-06 Source failure handling | S | 4, 6 | US-15 |
| UNIT-07 Pagination | C | I2 | US-12 |
| UNIT-08 Highlight text | C | I3 | US-04, US-06 |
| UNIT-09 CV scan | C | I4 | US-10 |
| UNIT-10 WCAG AA | C | 6–8 | US-16 |

**All 10 units delivered.** See `PROGRESS.md` for per-unit implementation details.

---

## Post-MVP Backlog (Future Consideration)

| Item | Category | RICE estimate |
|---|---|---|
| Search bar wired to `/api/jobs?q=` | Feature | High reach, medium effort |
| Multiple saved criteria profiles | Feature | Medium reach, low effort |
| Relative "posted X days ago" timestamps | Polish | High reach, minimal effort |
| Third job source | Feature | High reach, high effort |
| CSV export of ranked results | Feature | Low reach, low effort |
