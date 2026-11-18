# Unit of Work — Story Map

**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17  
**Key format:** `US-NN` (from `user-story.md` at project root, 16 stories, 5 epics)

> **Column layout (horizontal = user journey):**
> Discovery → Matching → Criteria → Browsing → Reliability

---

## Story Map

| Story ID | Story title | Implementing Unit(s) | U1 | U2 | U3 | U4 | U5 | U6 | U7 |
|---|---|---|---|---|---|---|---|---|---|
| **Epic 1 — Job Discovery** |
| US-01 | Browse ranked jobs without setup | U1; U3 | ✓ | | ✓ | | | | |
| US-02 | See which source a job came from | U1; U3 | ✓ | | ✓ | | | | |
| US-03 | Full details and Apply | U1; U3; U5 | ✓ | | ✓ | | ✓ | | |
| **Epic 2 — Personalised Matching** |
| US-04 | Match percentage from skills | U2; U3; U4; U7 | | ✓ | ✓ | ✓ | | | ✓ |
| US-05 | Minimum salary floor | U2; U4 | | ✓ | | ✓ | | | |
| US-06 | Exclude unwanted keywords | U2; U4; U7 | | ✓ | | ✓ | | | ✓ |
| US-07 | Filter by location / region | U1; U2 | ✓ | ✓ | | | | | |
| US-08 | Must-have benefits | U2; U4; U5 | | ✓ | | ✓ | ✓ | | |
| **Epic 3 — Criteria Management** |
| US-09 | Criteria survive page reload | U4 | | | | ✓ | | | |
| US-10 | Scan CV to auto-fill skills | U6 | | | | | | ✓ | |
| US-11 | Reset criteria | U4 | | | | ✓ | | | |
| **Epic 4 — Browsing & Navigation** |
| US-12 | Paginate results (10/page) | U7 | | | | | | | ✓ |
| US-13 | Sort by salary or recency | U3 | | | ✓ | | | | |
| US-14 | Mobile drawer for criteria | U3; U4 | | | ✓ | ✓ | | | |
| **Epic 5 — Reliability & Accessibility** |
| US-15 | Warning when source is down | U1; U3 | ✓ | | ✓ | | | | |
| US-16 | Full keyboard navigation | U3; U4; U5; U7 | | | ✓ | ✓ | ✓ | | ✓ |

---

## Cross-cutting rows

| Concern | Units | Notes |
|---|---|---|
| WCAG 2.2 AA (US-16) | U3, U4, U5, U7 | Accessibility woven through all UI units; U7 adds pagination announcements |
| Source attribution (US-02) | U1, U3 | U1 provides `sourceUrl`; U3 renders `SourceAttribution` |
| Benefit evidence (US-08) | U2, U5 | U2 detects + extracts snippets; U5 renders blockquotes |
| Hyphen normalisation (US-06) | U2, U7 | Both must use the same `normaliseHyphens()` logic |

---

## Coverage verification

| Unit | Stories implemented |
|---|---|
| U1 | US-01, US-02, US-03, US-07, US-15 |
| U2 | US-04, US-05, US-06, US-07, US-08 |
| U3 | US-01, US-02, US-03, US-04, US-13, US-14, US-15, US-16 |
| U4 | US-04, US-05, US-06, US-08, US-09, US-11, US-14, US-16 |
| U5 | US-03, US-08, US-16 |
| U6 | US-10 |
| U7 | US-04, US-06, US-12, US-16 |

**All 16 stories assigned to at least one unit.** ✓  
**All 7 units have at least one story.** ✓

---

## Implementation order within each unit

**U1:** Normalize helpers → salary parser → Himalayas adapter → Remotive adapter → cache → dedupe → aggregate → API route

**U2:** Types + config → salary parser → benefit dictionary → criteria schema → hard filters → scorer

**U3:** Theme + layout → SkipLink + LiveAnnouncer → SourceAttribution + SourceStatusBanner → BenefitChips → JobCard → JobList → page.tsx shell

**U4:** useCriteria hook → CriteriaForm (fields in order: keywords, titles, excluded, seniority, employment, salary, country, timezone, benefits) → Reset dialog → mobile Drawer wiring in page.tsx

**U5:** ScoreBreakdown → JobDetailPanel → wire card click in page.tsx

**U6:** skills-dictionary → extractCriteria → parseCv → CvScanner → wire into CriteriaForm

**U7:** HighlightText → pagination in JobList → highlight wiring in JobCard + JobDetailPanel → bugfix: match badge guard
