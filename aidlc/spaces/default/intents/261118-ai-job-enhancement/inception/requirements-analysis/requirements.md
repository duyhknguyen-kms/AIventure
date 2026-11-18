# Requirements Analysis

**Stage:** requirements-analysis
**Intent:** 261118-ai-job-enhancement
**Date:** 2026-11-18
**Project type:** Brownfield — extending the AIventure MVP

---

## Intent Analysis

This intent extends the existing AIventure remote-job matching platform with three capabilities:

1. **Improved CV Parsing** — replace or augment the heuristic keyword-scan approach (`extractCriteria.ts`) with higher-accuracy extraction, potentially LLM-assisted, while preserving client-side privacy.
2. **AI-Assisted Matching** — introduce LLM-based relevance scoring alongside or replacing the existing deterministic 7-factor weighted scorer (`scoreJob` in `src/lib/matching/score.ts`).
3. **QA Validation Layer** — systematic quality assurance of matching output: golden datasets, property-based tests, and traceability validation.

The existing app is a working Next.js 16 App Router application with 289 passing tests. All new work adds to or replaces parts of `src/lib/cv/`, `src/lib/matching/`, and their tests. No structural changes to the API route or UI components are required unless the LLM integration demands a new server-side endpoint.

---

## Functional Requirements

### FR1: Enhanced CV Parsing

**Description:** The system shall improve skill, job title, and seniority extraction from uploaded CVs (PDF and DOCX) to produce more accurate and complete pre-filled criteria.

**Acceptance Criteria:**
- Given a CV uploaded by the user
- When parsing completes
- Then the extracted skills list is more complete than the existing `SKILLS_DICTIONARY` word-boundary scan
- And the extracted job titles reflect actual role names from the CV, not just keyword matches
- And the extracted seniority reflects the candidate's actual level

#### FR1.1: Expanded Skills Dictionary
**Description:** The skills dictionary shall be expanded or replaced with a broader, more accurate vocabulary.

**Acceptance Criteria:**
- Given the current `skills-dictionary.ts` with ~120 entries
- When the enhancement is applied
- Then the dictionary covers at least 200 distinct skills across languages, frameworks, databases, cloud/DevOps, AI/ML, data, and testing
- And partial matches (e.g., "React.js" matching "React") are handled

> **[OPEN — Q1]:** Should the expanded dictionary remain a static file, or should skills be extracted dynamically via LLM? See `requirements-analysis-questions.md`.

#### FR1.2: LLM-Assisted Skill Extraction
**Description:** The system shall optionally use an LLM to extract skills from CV text with higher recall and precision than dictionary matching.

**Acceptance Criteria:**
- Given CV plain text
- When LLM extraction is enabled
- Then the LLM returns a structured list of skills, job titles, and seniority level
- And the result is merged with any dictionary-based extraction using `mergeExtracted()`
- And if the LLM call fails, the system falls back to dictionary-only extraction without user-visible error (graceful degradation)
- And the LLM call runs client-side OR server-side depending on the provider's SDK (see Q2)

> **[OPEN — Q2, Q3]:** Which LLM provider? Where do calls run (client/server)? See questions file.

#### FR1.3: Improved Job Title Extraction
**Description:** The job title extractor shall use context (proximity to dates, role keywords) rather than label patterns alone.

**Acceptance Criteria:**
- Given CV text containing role history entries like "Senior Software Engineer at ACME (2022–2024)"
- When extracting job titles
- Then "Senior Software Engineer" is returned, not just generic label matches
- And extracted titles are deduplicated and normalised to title case

#### FR1.4: Confirmation Dialog Update
**Description:** The CV confirmation dialog (`CvScanner.tsx`) shall show the source (dictionary vs. LLM) alongside each extracted item.

**Acceptance Criteria:**
- Given extraction ran with LLM assistance
- When the confirmation dialog is shown
- Then each extracted skill or title shows its source ("from CV" or "AI-suggested")
- And the user can deselect any item before applying

---

### FR2: AI-Assisted Job Matching

**Description:** The system shall introduce an LLM-based relevance score alongside or replacing the deterministic 7-factor scorer, to surface jobs that match the user's intent but score low on keyword overlap.

**Acceptance Criteria:**
- Given a job listing and user criteria
- When AI scoring is enabled
- Then a relevance score (0–100) is produced by the LLM
- And the score is displayed alongside or instead of the deterministic match %
- And the user can toggle between deterministic-only and AI-assisted ranking

#### FR2.1: Hybrid Scoring Mode
**Description:** The system shall support a hybrid mode where the AI score is blended with the deterministic score.

**Acceptance Criteria:**
- Given hybrid mode is active
- When scoring a job
- Then the final `matchPercent` is a weighted blend: `α × deterministicScore + (1−α) × aiScore`
- And α is configurable (default 0.5)
- And the score breakdown panel shows both component scores

> **[OPEN — Q4]:** What is the default blend weight? Should it be user-adjustable in the UI? See questions file.

#### FR2.2: AI Score Explanation
**Description:** The system shall display a brief natural-language explanation of why the AI assigned a particular score.

**Acceptance Criteria:**
- Given an AI-scored job
- When the user opens the job detail panel
- Then a 1–2 sentence explanation from the LLM is shown (e.g., "Strong match on backend skills and remote culture; salary range is below your minimum")
- And the explanation is never shown as a loading placeholder — it appears only when available

#### FR2.3: Fallback to Deterministic Scoring
**Description:** When the LLM is unavailable or over rate-limit, the system shall fall back to deterministic scoring transparently.

**Acceptance Criteria:**
- Given the LLM API returns an error or timeout
- When scoring jobs
- Then deterministic scores are used for all jobs
- And a dismissible banner ("AI scoring unavailable — showing keyword match scores") is shown
- And no job is left without a score

#### FR2.4: Scoring Privacy Boundary
**Description:** Job descriptions sent to an LLM shall be anonymised to remove personally identifying information before transmission.

**Acceptance Criteria:**
- Given a job description
- When preparing the LLM prompt
- Then company names and recruiter contact details are stripped from the description text before it is sent
- And user criteria (skills, salary) sent to the LLM are not logged or persisted by the application

> **[OPEN — Q5]:** Does the team have a data-residency or privacy requirement that restricts which LLM providers can be used?

---

### FR3: QA Validation Layer

**Description:** The system shall have a systematic QA layer for the matching engine: golden-dataset regression tests, property-based tests, and a traceability matrix linking requirements to test cases.

**Acceptance Criteria:**
- Given the matching engine codebase
- When the QA layer is applied
- Then every requirement in this document has at least one automated test case
- And the existing 289-test suite remains green
- And the CI pipeline enforces 80% line-coverage

#### FR3.1: Golden Dataset for Scoring
**Description:** A curated set of job fixtures and criteria pairs with known expected match percentages shall be maintained as regression tests.

**Acceptance Criteria:**
- Given a golden dataset of ≥10 job+criteria pairs
- When `scoreJob()` or the AI scorer runs
- Then each job scores within ±5% of its expected value
- And the golden dataset is stored as a JSON fixture under `web/tests/fixtures/`

#### FR3.2: Property-Based Tests for Scoring Invariants
**Description:** Property-based tests shall verify that the scoring engine satisfies key invariants regardless of input.

**Acceptance Criteria:**
- Given random valid `Job` and `Criteria` inputs
- When `scoreJob()` runs
- Then `matchPercent` is always an integer in [0, 100]
- And a job with zero active criteria always scores 100
- And `rankJobs()` output is always sorted descending by `matchPercent`

> **[OPEN — Q6]:** Which property-based testing library? (`fast-check` integrates with Vitest.) See questions file.

#### FR3.3: AI Scorer Property Tests
**Description:** The AI scorer shall have property tests covering fallback and boundary behaviour.

**Acceptance Criteria:**
- Given a mocked LLM that returns valid or invalid responses
- When `aiScoreJob()` runs
- Then it always returns a number in [0, 100] or throws a typed error
- And a timeout or 429 response always triggers the deterministic fallback

#### FR3.4: Requirements Traceability
**Description:** A traceability matrix shall link every FR and NFR in this document to at least one test case.

**Acceptance Criteria:**
- Given the requirements in this document
- When the QA traceability matrix is produced
- Then every FR and NFR has a row with: requirement ID, description, test case ID, test file, status (Covered / Not Covered)
- And the matrix is stored at `qa/traceability-matrix.md`

---

## Non-Functional Requirements

### NFR1: Performance — LLM-Augmented Scoring
**Target:** AI scoring for a page of 10 jobs completes in < 5 seconds at the 90th percentile.

**Acceptance Criteria:**
- Given 10 jobs to score with LLM assistance
- When AI scoring runs
- Then all 10 scores are available within 5 s (p90) under normal LLM API latency
- And scores are streamed or batch-requested to minimise round trips

### NFR2: Privacy — CV Data
**Target:** CV text never leaves the user's browser unless the user explicitly opts into server-side LLM extraction.

**Acceptance Criteria:**
- Given a user uploads a CV
- When extraction runs in client-side mode (default)
- Then no CV text is sent to any server or external API
- And if server-side extraction is offered, it requires explicit opt-in with a clear privacy notice

### NFR3: LLM Cost Management
**Target:** No unbounded LLM API spend.

**Acceptance Criteria:**
- Given LLM calls are made per job or per CV
- When the system sends requests
- Then prompt token counts are bounded: CV extraction ≤ 2,000 tokens; per-job scoring ≤ 500 tokens per job
- And a per-session request cap (default 50 LLM calls) prevents runaway spend

> **[OPEN — Q7]:** What is the acceptable monthly LLM budget? See questions file.

### NFR4: Accessibility
**Target:** All new UI elements meet WCAG 2.2 Level AA.

**Acceptance Criteria:**
- Given new UI elements (AI score display, explanation text, source labels in CV dialog)
- When tested with axe-core
- Then zero violations
- And loading states use `aria-busy` and live regions consistent with the existing dashboard pattern

### NFR5: Backward Compatibility
**Target:** The existing deterministic scorer continues to work without an API key configured.

**Acceptance Criteria:**
- Given no LLM API key is set in the environment
- When the application starts
- Then all features work exactly as before the enhancement (AI scoring is simply unavailable)
- And no console error or runtime exception occurs due to missing LLM configuration

---

## Constraints

### C1: Technology Stack (unchanged)
Next.js 16, TypeScript strict, MUI v9, Vitest — no stack changes.

### C2: No Database
LLM API keys remain server-side environment variables only (`NEXT_PUBLIC_` prefix forbidden per affirmed team rules).

### C3: Existing API Terms
Himalayas and Remotive ToS remain in force. LLM calls must not send raw job description URLs or company names that could constitute redistribution.

### C4: Test Coverage Floor
80% line-coverage in CI (affirmed in Practices Discovery). LLM-call code paths must be testable via mocked responses.

---

## Assumptions

### A1: LLM Provider TBD
The specific LLM provider (OpenAI, Anthropic, local Ollama, etc.) is not yet decided. Requirements are written provider-agnostically. The provider will be locked in at Domain Design.

### A2: Client-Side LLM Default
CV parsing remains client-side by default to preserve the existing privacy guarantee. LLM-assisted extraction will use a browser-compatible SDK or a thin server-side proxy.

### A3: Incremental Adoption
AI scoring is opt-in (toggled off by default) and falls back to deterministic scoring. Users who do not configure an LLM key see no behaviour change.

### A4: Existing Tests Remain Green
All 289 existing tests pass unmodified. New tests are additive only.

---

## Out of Scope

### OS1: LLM Fine-Tuning
No model training or fine-tuning for this intent.

### OS2: User Accounts / Profiles
Authentication and persistent user profiles remain out of scope.

### OS3: Real-Time Streaming UI
Streaming job scores token-by-token is not required; batch completion is acceptable.

### OS4: Multi-Language Support
UI remains English-only.

---

## Open Questions

> See `requirements-analysis-questions.md` for the full list. Requirements marked `[OPEN — Qn]` above depend on answers before construction begins.

| ID | Question | Affects |
|---|---|---|
| Q1 | Static vs. dynamic skills dictionary | FR1.1 |
| Q2 | LLM provider choice | FR1.2, FR2 |
| Q3 | Client-side vs. server-side LLM calls | FR1.2, FR2, NFR2 |
| Q4 | Hybrid blend weight (α) — UI-adjustable? | FR2.1 |
| Q5 | Data-residency / privacy constraint on provider | FR2.4 |
| Q6 | Property-based testing library | FR3.2 |
| Q7 | Monthly LLM budget ceiling | NFR3 |

---

## Traceability Note

Requirement IDs follow the pattern `FR{n}`, `FR{n}.{m}`, `NFR{n}`. Downstream stages must preserve these IDs exactly.

## Sources

- Initial description: `aidlc/spaces/default/intents/261118-ai-job-enhancement/project-description.json`
- Brownfield evidence: `aidlc/spaces/default/codekb/AIventure/business-overview.md`, `architecture.md`, `code-structure.md`
- Team practices: `inception/practices-discovery/team-practices.md`

## Assumptions & Open Questions

> Questions marked [OPEN] above are listed in full in `requirements-analysis-questions.md`.

None resolved yet — pending interview.
