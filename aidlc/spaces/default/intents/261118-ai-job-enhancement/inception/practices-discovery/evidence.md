# Evidence — Practices Discovery

Brownfield inspection for intent `261118-ai-job-enhancement`. Six CodeKB files were read in full
(`business-overview.md`, `technology-stack.md`, `dependencies.md`, `code-quality-assessment.md`,
`architecture.md`, `code-structure.md`), supplemented by direct reads of `.github/workflows/ci.yml`,
`web/tsconfig.json`, and `web/vitest.config.ts`, and a `git log --oneline --all` to surface branch
and merge history.

---

## Way of Working

The git history shows a consistent GitHub Flow pattern: feature work happens on branches named
`feat/<slug>`, `feature/<slug>`, and `fix/<slug>`, each merged to `main` via a pull request (confirmed
by "Merge pull request #N" commit messages). The CI pipeline is wired to `push: main` and
`pull_request: main` only, with no other trigger branches configured. This strongly implies `main`
is the single integration branch and all delivery goes through PRs. What is **not** in the evidence:
reviewer count requirements, branch protection rules, whether squash-merge or merge-commit is
enforced at the GitHub repository level, any hotfix bypass policy, and sprint or iteration cadence.
These must be confirmed in the interview.

## Walking Skeleton

No walking skeleton documentation or ceremony is present in any evidence file. The MVP was built
by sequencing features (matching engine first, then API route, then UI, then CV parsing, then
accessibility), which is pragmatically incremental but is not the same as a skeleton-first discipline
with an explicit checkpoint. The business-overview and code-structure files describe the build sequence
retrospectively; there is no evidence of a go/no-go gate on a minimal end-to-end slice before continuing
to later features. This is **inferred** as a non-practiced discipline — the interview should confirm
whether the team wants to adopt one for the AI enhancement intent or continue feature-sequential.

## Testing Posture

The test suite is extensively documented in `code-quality-assessment.md` and is objectively strong:
289 tests across 22 files, zero failures, zero TypeScript errors, zero lint errors, covering unit,
integration, component, accessibility, and golden/regression tiers. The methodology is **inferred as
test-after** from two signals: (1) test files named `improve-cv.test.ts`, `improve-filters.test.ts`,
and `improve-pagination-highlight.test.ts` were added in a commit titled "docs(construction): update
code generation plan checkboxes", indicating tests followed implementation; (2) the code-quality
assessment describes coverage as exercising "all files under `src/lib/` comprehensively through golden
tests and edge-case matrices" — a retrospective framing consistent with test-after. No TDD or BDD
discipline (spec files, `Given/When/Then` scenarios, failing-test-first evidence) is present anywhere.
The 80% line-coverage floor documented in `org.md` for feature-scope work is an org-level default;
whether this team actively measures against it in this project is **unclear — confirm in interview**.
The known gap in `parseCv.ts` coverage is explicitly documented and unresolved.

## Deployment

The CI pipeline is fully evidenced in `.github/workflows/ci.yml`: four steps (type-check → lint →
test → build), `ubuntu-latest` runner, Node 22, `npm ci` for reproducible installs. No CD pipeline,
no container configuration, no Kubernetes or serverless deployment manifests are present anywhere in
the workspace. The business-overview explicitly lists Docker and Sentry as "explicitly excluded from
the MVP". The `dependencies.md` mentions Vercel as a potential deployment path ("next-step if needed")
but no Vercel configuration exists. The in-memory cache architecture means that horizontal scaling
would require an external cache layer — this is documented as a known limitation. The gap is complete:
there is **no deployment pipeline at all beyond CI**. Whether one is in scope for this next intent
(AI enhancement) is **unclear — confirm in interview**.

## Code Style

TypeScript strict mode and ESLint are fully evidenced in `tsconfig.json` and `eslint.config.mjs`.
Naming conventions (file kebab-case, component PascalCase, constant SCREAMING\_SNAKE\_CASE, function
camelCase) are consistent across the 39 source modules and are explicitly documented in
`code-structure.md`. The MUI/Emotion-only styling constraint (no Tailwind, no CSS modules, no
`dangerouslySetInnerHTML`) is both documented and enforced by the absence of competing styling
packages in `package.json`. What is **not** evidenced: Prettier or any other formatter configuration
(no `.prettierrc`, `prettier.config.*`, or `format` script in the scripts documented in
`technology-stack.md`), JSDoc or in-code documentation conventions beyond inline comments, and any
explicit policy on default vs. named exports. All three should be confirmed in the interview.

---

## Interview Decisions

Confirmed by the team in the practices-discovery interview (2026-11-18). These answers resolve the
open items identified during brownfield inspection above.

**Q1 — Merge Strategy (Way of Working)**
Regular merge commits; no squash policy. No branch protection rules are required (no enforced
reviewer count, no required status checks at the GitHub repository level). The team operates on trust
and the existing PR-to-main GitHub Flow convention.

**Q2 — Walking Skeleton**
Not practiced for this intent. The existing application already proves full end-to-end integration.
Work on the AI enhancement intent proceeds feature-by-feature with no formal skeleton slice or
checkpoint gate.

**Q3 — Coverage Floor and LLM Testing**
80% line-coverage is enforced in CI — any PR that drops below this threshold fails. The blank
follow-up answer (whether to mock LLM calls or skip coverage for them) is treated as the standard
approach: mock LLM responses in unit tests using deterministic fixtures. Live LLM API calls are
never made in the CI pipeline.

**Q4 — Deployment**
CI only. No CD pipeline is in scope for this intent. Deployment remains manual. This is consistent
with the brownfield evidence (no container configuration, no deployment manifests) and aligns with
the team's current single-instance PoC operating model.

**Q5 — Formatter**
ESLint only; Prettier is not being added at this time. The team chose to keep the existing toolchain
unchanged and not introduce a formatter as part of this intent.
