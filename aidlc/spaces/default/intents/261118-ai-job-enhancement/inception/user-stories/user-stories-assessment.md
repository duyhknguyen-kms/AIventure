# User Stories Assessment

**Stage:** user-stories
**Intent:** 261118-ai-job-enhancement
**Date:** 2026-11-18

---

## Coverage Assessment

| Story | Requirement | INVEST | AC Testable | Priority | Notes |
|---|---|---|---|---|---|
| US-001 | FR1.1 | ✅ | ✅ | Must | Independent of US-002; tests `extractSkills()` only |
| US-002 | FR1.2 | ✅ | ✅ | Must | Independent of US-001; tests `extractJobTitles()` only |
| US-003 | FR2.1 | ✅ | ✅ | Must | Requires golden fixture file; CI-enforced |
| US-004 | FR2.2 | ✅ | ✅ | Must | Requires property-based library install |
| US-005 | FR2.3 | ✅ | ✅ | Should | Output extends existing `qa/traceability-matrix.md` |

## NFR Coverage

| NFR | Coverage | Via |
|---|---|---|
| NFR1 (80% coverage) | Implicit | All new test files raise coverage; CI enforces floor |
| NFR2 (accessibility) | No new UI | No new components; existing axe suite unchanged |
| NFR3 (backward compatibility) | Implicit | US-001–US-004 are purely additive; no existing tests modified |

## Gaps

None. All 5 requirements (FR1.1, FR1.2, FR2.1, FR2.2, FR2.3) have at least one story with testable Given/When/Then criteria.

## Suggested delivery order

1. **US-001** — expand `skills-dictionary.ts` (pure data change, lowest risk)
2. **US-002** — improve `extractJobTitles()` heuristics
3. **US-003** — create `golden-scoring.json` fixture + `score-golden.test.ts`
4. **US-004** — install property-based library + create `score-property.test.ts`
5. **US-005** — produce updated `qa/traceability-matrix.md`

US-001 and US-002 have no dependencies on each other and can be built in parallel if needed.
US-003 and US-004 both depend on the existing `scoreJob()` being stable (no changes required).
US-005 depends on all prior stories being complete (traceability cannot be final until tests exist).
