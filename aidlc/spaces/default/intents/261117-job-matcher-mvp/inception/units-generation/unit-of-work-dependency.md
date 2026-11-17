# Unit of Work — Dependency DAG

**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17

> **Topology only.** This artifact describes what can depend on what.
> It does NOT prescribe build order or identify a critical path — those are
> economic sequencing decisions made in Delivery Planning.

---

## Dependency Graph (prose)

```
U1 · u1-data-sources ──────────────────────────────► U3 · u3-dashboard-core ──► U5 · u5-detail-panel
                                                           │                       │
U2 · u2-matching-engine ──► U4 · u4-criteria-form ──► U7 · u7-pagination-highlight
         │                        │
         │                        └──────────────────► U6 · u6-cv-scanner
         └──────────────────────────────────────────► U3
                                                       └──► U5
```

Legend: `A ──► B` means B depends on A (B's code or tests require A to build or pass).

---

## Edge Definitions

### U1 · `u1-data-sources`
**Depends on:** nothing  
**Dependents:** U3

U1 is a foundation layer. It fetches, validates, normalises, deduplicates, and caches jobs. It has no runtime dependency on any other unit in this project. U2, U4, U6 consume the `Job` type it defines, but that type is declared in `src/lib/types.ts` which both units can read independently.

**Integration point exposed:**
- `GET /api/jobs → { jobs: Job[], sources: SourceStatus[], fetchedAt: string }` over HTTP
- `Job`, `SourceStatus` TypeScript types

---

### U2 · `u2-matching-engine`
**Depends on:** nothing  
**Dependents:** U3, U4, U5, U6, U7

U2 is a pure-function library. It consumes `Job` types (defined in `types.ts`) and produces `MatchResult`. It imports nothing from U1, U3, U4, U5, U6, or U7. All 7 factor scorers, the 3 hard filters, and benefit extraction are side-effect-free and independently testable.

**Integration point exposed:**
- `scoreJob(job, criteria) → MatchResult`
- `rankJobs(jobs, criteria) → { ranked, excluded }`
- `Criteria`, `DEFAULT_CRITERIA`, `CriteriaSchema` (Zod)
- `MatchResult`, `FactorResult`, `DetectedBenefit` types

---

### U3 · `u3-dashboard-core`
**Depends on:** U1, U2  
**Dependents:** U5, U7

U3 builds the primary visible surface. It consumes `Job[]` from U1's API endpoint and calls `rankJobs` from U2. Without U1 there is no data; without U2 there is no match percentage to display.

**Integration points consumed:**
- `GET /api/jobs` (from U1)
- `rankJobs`, `MatchResult` (from U2)

**Integration points exposed:**
- `JobCard` and `JobList` React components (consumed by U7 for pagination + highlight)
- `page.tsx` state: `selectedJob` → U5

---

### U4 · `u4-criteria-form`
**Depends on:** U2  
**Dependents:** U6, U7

U4 provides the user-facing criteria editor and localStorage persistence. It depends only on U2 for the `Criteria` schema and `DEFAULT_CRITERIA`. It does NOT depend on U1 (it never fetches jobs directly) or U3 (it doesn't render cards).

**Integration point consumed:**
- `CriteriaSchema`, `DEFAULT_CRITERIA`, `BenefitKeyEnum` (from U2)

**Integration point exposed:**
- `useCriteria() → [criteria, setCriteria]` hook
- `CriteriaForm` React component (mounted in `page.tsx`, which lives in U3)

---

### U5 · `u5-detail-panel`
**Depends on:** U2, U3  
**Dependents:** none

U5 opens from a card click in U3 (`selectedJob` state) and renders a `MatchResult` from U2. Its `ScoreBreakdown` renders `FactorResult[]` from U2. It has no dependents — it is a leaf in the DAG.

**Integration points consumed:**
- `MatchResult`, `FactorResult`, `DetectedBenefit` (from U2)
- `selectedJob` state, card click callback (from U3 / `page.tsx`)

---

### U6 · `u6-cv-scanner`
**Depends on:** U2, U4  
**Dependents:** none

U6 reads the current `criteria` from `useCriteria` (U4) and merges extracted results back through `onChange`. It calls `mergeExtracted` which produces a `Criteria` conforming to U2's schema. No dependency on U1 (never touches jobs) or U3 (never renders cards). Leaf in the DAG.

**Integration points consumed:**
- `Criteria`, `mergeExtracted` (from U2 / `extractCriteria.ts`)
- `useCriteria` / `onChange` (from U4)

---

### U7 · `u7-pagination-highlight`
**Depends on:** U3, U4  
**Dependents:** none

U7 adds pagination to the `JobList` from U3 and wires `HighlightText` through `JobCard` (U3). It also threads `keywords`, `targetTitles`, and `excludedKeywords` from `criteria` (U4) down to the render components. It is a leaf in the DAG.

**Integration points consumed:**
- `JobList`, `JobCard`, `JobDetailPanel` (from U3)
- `criteria.keywords`, `criteria.targetTitles`, `criteria.excludedKeywords` (from U4 via `page.tsx`)

---

## Machine-readable edge block

```yaml
units:
  - name: u1-data-sources
    kind: service
    depends_on: []
  - name: u2-matching-engine
    kind: library
    depends_on: []
  - name: u3-dashboard-core
    kind: ui
    depends_on: [u1-data-sources, u2-matching-engine]
  - name: u4-criteria-form
    kind: ui
    depends_on: [u2-matching-engine]
  - name: u5-detail-panel
    kind: ui
    depends_on: [u2-matching-engine, u3-dashboard-core]
  - name: u6-cv-scanner
    kind: ui
    depends_on: [u2-matching-engine, u4-criteria-form]
  - name: u7-pagination-highlight
    kind: ui
    depends_on: [u3-dashboard-core, u4-criteria-form]
```

---

## Parallel development opportunities

The DAG has two independent roots — U1 and U2 — with no edge between them. They can be built simultaneously in isolated workspaces.

After U1 and U2 are complete:
- U3 and U4 can begin at the same time (U3 needs both roots; U4 needs only U2)
- Once U3 and U4 are both complete, U5, U6, and U7 can all start simultaneously (each depends on a different subset)

```
Level 0 (parallel):   U1  U2
Level 1 (parallel):   U3  U4   (U3 waits for both L0; U4 waits for U2 only)
Level 2 (parallel):   U5  U6  U7
```

This is a topology. Delivery Planning picks the economic path through it.

---

## Cross-cutting concerns

| Concern | Spans | Notes |
|---|---|---|
| WCAG AA accessibility | U3, U4, U5, U6, U7 | Each UI unit owns its own a11y. Automated axe tests per component. |
| `src/lib/types.ts` | All units | Shared type file — not a unit itself; treated as a schema dependency |
| `src/theme.ts` | All UI units | MUI theme — reduced-motion, focus rings, WCAG palette |
| Hyphen normalisation | U2, U7 | `normaliseHyphens()` used in both `filters.ts` and `HighlightText` — must stay in sync |
