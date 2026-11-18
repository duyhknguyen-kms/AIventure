# Developer Scan — AI Job Enhancement Intent

**Intent:** `261118-ai-job-enhancement`  
**Scan date:** 2026-11-18  
**Agent:** `aidlc-developer-agent` (sole pipeline link)  
**Conversation language:** English

---

## Purpose

This document summarises what the reverse engineering scan found that is **directly relevant to the three enhancement areas**: improved CV parsing, AI-based matching, and QA validation. It is the pipeline link artifact for the architect and subsequent inception stages.

---

## 1. CV Parsing — Current State and Enhancement Surface

### What exists today

**Files:** `src/lib/cv/parseCv.ts`, `src/lib/cv/extractCriteria.ts`, `src/lib/cv/skills-dictionary.ts`  
**Entry point:** `CvScanner.tsx` → `parseCv(file)` → `extractCriteriaFromText(text)` → `mergeExtracted(current, extracted)`

#### Parsing layer (`parseCv.ts`)

| Aspect | Current Implementation |
|--------|----------------------|
| Supported formats | PDF (via `pdfjs-dist@6.5.438`), DOCX (via `mammoth@1.13.0`) |
| Execution environment | **Browser-only** — file never sent to server |
| PDF extraction | Page-by-page `getTextContent()` → `item.str` concatenation |
| DOCX extraction | `mammoth.extractRawText({ arrayBuffer })` |
| File size limit | 5 MB hard cap before parsing |
| Return type | `{ ok: true; text: string } \| { ok: false; error: string }` |
| Error cases | >5 MB, encrypted PDF, scanned/image PDF (empty text), corrupted file, unsupported extension |
| Bundle strategy | Dynamic imports — neither library in the initial bundle |

#### Extraction layer (`extractCriteria.ts`)

| Aspect | Current Implementation |
|--------|----------------------|
| Skills extraction | `extractSkills(text)` — word-boundary regex over ~120-entry `SKILLS_DICTIONARY` |
| Title extraction | `extractJobTitles(text)` — explicit label patterns (`Title:`, `Position:`, `Role:`) + proximity to date ranges using `ROLE_KEYWORDS` regex |
| Seniority extraction | `extractSeniority(text)` — reuses `inferSeniorityFromTitle()` on each line; + years-of-experience heuristic (`8+yr→senior`, `3–7yr→mid`, `<3yr→entry`) |
| Merge policy | `mergeExtracted()` — Set-deduplicated append; never overwrites salary, country, timezone, benefits |
| Output type | `ExtractedCriteria = { keywords: string[], targetTitles: string[], seniority: Seniority[] }` |

#### Skills dictionary (`skills-dictionary.ts`)

- Flat array of ~120 literal strings.
- Covers: languages (27), web frameworks (22), mobile (5), databases (15), cloud/DevOps (20), data/AI (15), other tech (15).
- Match is **case-insensitive word-boundary regex** — no semantic matching, no embeddings.
- Notable gap: no soft skills, no domain skills (healthcare, finance, legal), no product/design skills.

### Enhancement opportunities identified

1. **Accuracy of skills extraction** — the dictionary approach produces many false negatives (skills not in the list) and cannot handle synonyms or compound skills (e.g. "React Native" vs "RN"). An LLM extraction pass could replace or augment the dictionary.

2. **Title extraction brittleness** — the two patterns (explicit label + date proximity) miss most CVs that use layout-heavy PDFs where text ordering is non-linear. pdfjs loses reading order in multi-column layouts.

3. **No work-history parsing** — `extractCriteria.ts` returns flat arrays; there is no structured experience timeline (company, role, dates, duration). This limits matching quality.

4. **Client-only constraint** — the current design is a privacy feature (file never leaves browser). An AI-assisted extraction would require either: (a) sending extracted text (not the file) to a server endpoint, or (b) running a local model. The extraction output `{ text: string }` from `parseCv.ts` is already clean text — an easy handoff to a server endpoint.

5. **No test coverage for `parseCv.ts`** — the browser `File` API and dynamic imports make this hard to test in Vitest's `node` environment. Any enhancement should address testability.

6. **Merge policy is append-only** — `mergeExtracted` never replaces. If the user has wrong skills manually entered, CV scan cannot correct them. A future enhancement might offer a "replace" option in the UI dialog.

**Key insertion point for AI CV parsing:**  
`parseCv.ts` → `extractCriteriaFromText(text)` ← replace or augment this call with an AI extraction function. The function signature `(text: string) → ExtractedCriteria` is a clean seam — a server-side LLM call would fit here.

---

## 2. AI Matching — Current State and Enhancement Surface

### What exists today

**Files:** `src/lib/matching/criteria.ts`, `src/lib/matching/filters.ts`, `src/lib/matching/score.ts`, `src/lib/matching/benefits.ts`, `src/lib/config.ts`

#### Hard filters (`filters.ts`)

Three filters, all pure functions, all with unit tests:

| Filter | Key | Behaviour |
|--------|-----|-----------|
| F1 | Location | Country or region membership check |
| F2 | Excluded keywords | Word-boundary match in haystack (title + company + tags + categories + descriptionText) |
| F3 | Salary floor | `annualMax < minSalary.amount` (same currency) |

These are hard gates — a job that fails any filter is excluded entirely, not scored. They should be **preserved** in an AI enhancement; they are correctness rules, not preference signals.

#### Soft scorer (`score.ts`) — 7-factor weighted system

| Factor | Weight | Active condition | Score formula |
|--------|-------:|-----------------|---------------|
| skills | 30 | `keywords.length > 0` | matched / total keywords |
| title | 20 | `targetTitles.length > 0` | phrase match (1) or best token overlap |
| seniority | 10 | `seniority.length > 0` | exact (1), 1-step (0.5), unknown (0.5), else 0 |
| salary | 15 | `minSalary` set | 1 / 0.75 / 0.5 / 0 by range intersection |
| employment | 5 | `employmentTypes.length > 0` | exact (1), unknown (0.5), else 0 |
| timezone | 5 | `timezoneOffset` set | ≤0.5h (1), ≤2h (0.5), unknown (0.5), else 0 |
| benefits | 15 | any benefit list non-empty | `(2×mustFound + niceFound) / (2×mustTotal + niceTotal)` |

**Formula:** `matchPercent = round(100 × Σ(w×s) / Σ(w))` over active factors only. If all factors are inactive, `matchPercent = 100`.

**Key observation:** The scorer only uses structured fields from `Criteria` (keywords, titles, seniority, salary, etc.). It does **not** do any semantic reasoning about the job description beyond keyword lookup. The `descriptionText` is only used as a haystack for keyword matching and benefit detection.

#### Benefit detector (`benefits.ts`)

9 categories, regex-based, one entry per key maximum. Evidence snippets (±60 chars) are stored. Used both in the score (factor `benefits`) and displayed in `JobDetailPanel`.

#### Scoring is client-side

`rankJobs(jobs, criteria)` runs in the browser as a `useMemo` in `page.tsx`. No server state is involved. This is a clean separation: the API returns raw `Job[]`, and the browser scores them.

### Enhancement opportunities identified

1. **Replace keyword matching with semantic similarity** — the skills factor computes exact word-boundary matches. A cosine similarity over embeddings would catch synonyms (e.g. "JS" ↔ "JavaScript"), related skills (e.g. "React" ↔ "Next.js"), and inferred experience (e.g. "5 years Python" in description even without keyword).

2. **LLM-based job relevance scoring** — the current 7-factor formula treats all active criteria equally (renormalised). An LLM could produce a holistic relevance score from the job description + criteria profile as natural language.

3. **Hybrid approach** — keep hard filters (F1–F3) deterministic (correctness, explainability), replace or supplement the soft scorer with AI relevance. The `MatchResult` type already supports a `matchPercent` and `factors[]` breakdown — an AI scorer could fill these same fields.

4. **Server-side scoring path** — moving scoring to the server would allow using LLM APIs (OpenAI, Bedrock, etc.) without exposing keys to the browser. The API route could accept criteria as a request body and return `Job & { match: MatchResult }[]` directly. This is a significant architectural change.

5. **Criteria schema is well-defined** — `CriteriaSchema` (Zod) is the single source of truth for user preferences. It is serialisable to JSON and can be directly used as a prompt input.

6. **Golden test at §7.5** — the score.test.ts file contains a fully specified golden test (88% for a described job against described criteria). Any AI scorer must maintain parity with or beat this baseline.

**Key insertion point for AI matching:**  
`scoreJob(job: Job, criteria: Criteria): MatchResult` — this function can be replaced or supplemented. The seam is clean: same input/output types, all callers (page.tsx, tests) go through `rankJobs` which calls `scoreJob`.

---

## 3. QA Validation — Current State and Enhancement Surface

### What exists today

#### Test infrastructure

| Layer | Tool | Count |
|-------|------|-------|
| Pure-logic unit tests | Vitest (node) | ~200 tests across 13 files |
| Component tests | @testing-library/react + jsdom | ~40 tests across 4 component files |
| Accessibility tests | axe-core + jsdom | ~20 tests across 4 a11y files |
| Regression / golden | Vitest (node) | §7.5 golden test, filter regressions (21 tests), CV extraction regressions (17 tests) |

#### Existing quality gates

| Gate | Mechanism |
|------|-----------|
| Type safety | TypeScript `strict: true`, `tsc --noEmit` in CI |
| Lint | ESLint with `eslint-config-next` |
| Test pass | `vitest --run` in CI (289 tests) |
| Scoring regression | §7.5 golden test (locked to 88%) |
| A11y regression | axe-core 0-violation tests |
| Weight integrity | `WEIGHTS sum = 100` unit test |
| Zod validation | All external API responses and stored criteria validated at runtime |

#### Gaps relevant to AI enhancement

| Gap | Description |
|-----|-------------|
| No property-based tests | The scoring engine is pure and would benefit from PBT (e.g., Hypothesis-style): "matchPercent is always 0–100", "empty criteria always gives 100", "adding an exact skill keyword never lowers the score". |
| No LLM output validation | There is no framework for asserting correctness of LLM-generated text. If AI CV parsing is added, extracted fields need comparison against human-labelled ground truth. |
| No test dataset | There is no golden dataset of (CV text, expected extracted criteria) pairs for regression testing CV extraction quality. |
| No A/B comparison infrastructure | There is no mechanism to compare the current deterministic scorer against a new AI scorer across a sample job set. |
| `parseCv.ts` coverage gap | Browser-only parsing code has no unit tests. Any LLM-assisted extraction function must be designed for testability. |
| Stochastic outputs | LLM calls produce non-deterministic outputs. Tests must use deterministic stubs / recorded responses in CI. |

### Enhancement opportunities identified

1. **Property-based tests for the scoring engine** — add fast-check or similar PBT library. Properties to test: score always in [0,100]; empty criteria → 100; exact keyword match → skills score = 1; renormalisation property (removing an inactive factor does not change the result). These are invariant regardless of whether the scorer is deterministic or AI-based.

2. **Ground-truth test dataset for CV extraction** — create `tests/fixtures/cv-samples/` with a small set of (plain-text CV, expected ExtractedCriteria) pairs. Use these in `improve-cv.test.ts` for regression testing as the extraction improves.

3. **LLM output stub / VCR pattern** — for AI-assisted extraction or scoring, record the LLM response (similar to `tests/fixtures/himalayas-browse.json`) and replay it in tests. This keeps CI deterministic.

4. **Score comparison harness** — a utility that runs both the deterministic scorer and the AI scorer on the same `(Job, Criteria)` pair and asserts that the AI score is within an acceptable delta, or is directionally correct (better job → higher score).

5. **Zod validation for AI-extracted criteria** — `extractCriteriaFromText` currently returns `ExtractedCriteria` with no validation. If this is replaced by an LLM call, the response must be validated against a Zod schema before being merged into `Criteria`. The `CriteriaSchema` already defines the target shape.

---

## 4. Reusable Artifacts from Prior Intent

The following artifacts from `261117-job-matcher-mvp` can be reused or extended without full regeneration:

| Artifact | Reuse recommendation |
|----------|---------------------|
| `Job` type (`types.ts`) | Fully reusable — no changes required |
| `Criteria` type and `CriteriaSchema` (`criteria.ts`) | Extend with AI-specific fields if needed (e.g., `aiMatchScore`), but the base schema is complete |
| `MatchResult` / `FactorResult` types | Extend `FactorKey` if AI adds new factors; existing UI (`ScoreBreakdown`) renders any `FactorResult[]` |
| Hard filters F1–F3 (`filters.ts`) | Fully reusable — keep deterministic |
| `extractBenefits()` (`benefits.ts`) | Fully reusable |
| `parseCv.ts` (browser text extraction) | Keep as-is; wrap with server-side AI extraction as an optional enhancement |
| `SKILLS_DICTIONARY` | Keep as fallback; AI extraction can produce a superset |
| All 289 tests | All must remain passing after enhancement; golden test (88%) must be maintained or explicitly superseded |
| A11y test suite | Keep all 4 a11y test files; extend for any new components |
| `useCriteria` hook | Fully reusable |
| Cache + dedupe layer | Fully reusable — no changes needed |

---

## 5. Architecture Implications for Enhancement Intent

### CV Parsing with AI

**Proposed seam:**

```
parseCv(file: File) → ParseResult { ok, text }
                           │
              [current] extractCriteriaFromText(text)
              [enhanced] extractCriteriaFromTextAI(text) → server call → LLM → ExtractedCriteria
```

- Text is clean, plain-text output from parseCv — ready for LLM context.
- Server endpoint needed: `POST /api/cv/extract` accepting `{ text: string }` and returning `ExtractedCriteria`.
- Must validate LLM response with Zod before returning.
- Privacy: only the extracted text (not the file) goes to the server if implemented.

### AI Matching

**Option A — Augment** (lower risk): Keep `scoreJob()`, add an AI semantic score as an additional factor or as a tie-breaker.

**Option B — Replace** (higher risk): Replace `scoreJob()` with a server-side LLM scorer returning `MatchResult`. Requires a new API endpoint (e.g., `POST /api/score` or batch `POST /api/rank`).

Both options must maintain the `MatchResult` interface so `ScoreBreakdown.tsx` and `BenefitChips.tsx` continue to work without changes.

### QA Validation

Minimum viable QA extension:
1. Add `fast-check` (or similar PBT library) for scoring invariants.
2. Add `tests/fixtures/cv-samples/` with ≥5 labelled CV samples.
3. Add VCR-style test helpers for LLM response replay in CI.

---

## 6. Summary of Critical Findings

| Finding | Relevance |
|---------|-----------|
| CV text extraction is browser-only, file never sent to server | Architecture decision point: enhancement must either send extracted text to server or run model locally |
| Skills dictionary has ~120 entries — high false-negative rate for niche skills | Highest-impact improvement area for CV parsing |
| Scoring is entirely deterministic and client-side — no AI hooks | Clean seam for replacement/augmentation at `scoreJob()` function level |
| Hard filters (F1–F3) are correct and well-tested — keep them | Do not introduce non-determinism into eligibility gates |
| `MatchResult` interface is stable and consumed by multiple components | Any AI scorer must conform to this interface |
| 289 tests with 0 failures provide a strong regression baseline | All tests must remain green after enhancement |
| `CriteriaSchema` (Zod) is the canonical criteria contract | LLM output must be validated against this schema before use |
| No PBT, no golden dataset, no LLM stub infrastructure | QA validation work must build this foundation |
