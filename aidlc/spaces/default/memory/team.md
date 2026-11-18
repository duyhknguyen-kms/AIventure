# Team-Level Rules

> This team's affirmed practices and corrections. Loaded after `org.md` as
> strict-additive guidance.
> Populated by the practices-discovery affirmation gate. Edit at the gate,
> not directly.

## Way of Working

We use **GitHub Flow**: short-lived feature and fix branches opened as pull requests against `main`.
The CI pipeline triggers on every `push` to `main` and every `pull_request` targeting `main` — there are
no other long-lived integration branches. Git history shows branch naming conventions of
`feat/<slug>`, `fix/<slug>`, and `feature/<slug>` — all merging back to `main` through PRs.

- **Integration branch**: main
- Branches are short-lived (single feature or fix scope).
- Code review is conducted through GitHub pull requests.
- **Merge strategy**: regular merge commits (preserves branch history). No squash policy.
- **Branch protection**: none required — no enforced reviewer count or required status checks at the GitHub repository level.
- No trunk-based commit-directly-to-main pattern is in use.
- Hotfix process: not documented; follows the same PR-to-main flow by inference.

## Walking Skeleton

No walking skeleton ceremony is practiced for this project. The MVP was built feature-by-feature
(matching engine → API route → UI components → CV parsing → accessibility fixes), and the team confirmed
that the existing app already proves end-to-end integration. For the AI enhancement intent, work
proceeds feature-by-feature without a formal skeleton slice or checkpoint gate.

- **Walking skeleton**: not practiced
- **Rationale**: existing application demonstrates full-stack integration; a thin integration slice adds
  no additional proof before feature development begins.

## Testing Posture

We write tests after implementing each module. The test suite is organised as pure-logic unit tests
(Vitest + `node` environment), integration tests (mocked source adapters), component tests
(`@testing-library/react` + `jsdom`), accessibility tests (`axe-core`), and golden/regression tests.
All 289 tests pass with zero TypeScript errors and zero lint errors.

- **Methodology**: test-after
- **Methodology evidence**: 289 existing Vitest tests written after implementation; no TDD/BDD markers in test file names or descriptions
- **Ordering**: implement each applicable testable layer, then write and run that layer's tests.
- **Coverage floor**: 80% line-coverage enforced in CI — any PR dropping below this threshold fails the CI pipeline.
- **LLM call testing**: mock LLM responses in unit tests; do not hit live APIs in CI.
- **Coverage tooling**: `@vitest/coverage-v8` (text, JSON, HTML reporters).
- **Known gap**: `parseCv.ts` has no unit test coverage due to browser-API coupling (`File`, dynamic imports, `GlobalWorkerOptions`). This gap is documented and accepted.

TDD or property-based testing: not evidenced; not practiced.

## Guard Policy

<!-- Affirmed by the team. Mode: strict, relaxed, or off. Strict here holds for every intent, whatever one person asks in chat; relaxed or off here applies to every intent whose policy came from its scope, unless project.md or the person sets another; changing this line changes it. A section under the retired Change Control heading, written by an earlier release, is still read. -->

## Deployment

CI runs on GitHub Actions (`ubuntu-latest`, Node 22) with four sequential steps: type-check
(`tsc --noEmit`), lint (`eslint`), test (`vitest --run`), and build (`next build`).

- **CI only** — no CD pipeline. Deployment is manual.
- No container configuration (Docker explicitly excluded from scope).
- No observability SDK (Sentry explicitly excluded from scope).
- No deployment-to-production automation. The application is deployed manually when a release is ready.
- In-memory TTL cache (`globalThis.__aiventureCache`) is per-process; horizontal scaling would require
  an external cache layer. Accepted limitation for single-instance operation.
- Target platform: not locked. Vercel is mentioned in `dependencies.md` as a future option.

## Code Style

TypeScript `strict: true` is enforced across the entire codebase. ESLint uses `eslint-config-next`
(covers React, React Hooks, and import rules). **No formatter** — ESLint only; Prettier is not
configured and is not being added at this time.

Naming conventions:
- Files: kebab-case (`extractCriteria.ts`, `JobDetailPanel.tsx`)
- React components: PascalCase default export (`CriteriaForm`, `JobList`)
- Types / interfaces: PascalCase (`Job`, `MatchResult`, `Criteria`)
- Constants: SCREAMING\_SNAKE\_CASE (`WEIGHTS`, `BENEFIT_DICTIONARY`, `SKILLS_DICTIONARY`)
- Pure functions and hooks: camelCase (`scoreJob`, `useCriteria`)
- Path alias: `@/` resolves to `web/src/`

Styling: MUI `sx` prop and Emotion `styled()` exclusively. Tailwind is explicitly excluded.
No `dangerouslySetInnerHTML`; HTML from upstream APIs is stripped to plain text before display.

Default exports: React components use default exports (inferred from component file patterns).
Comment style: in-line `// @vitest-environment node` for per-file environment overrides;
`// eslint-disable-next-line` for intentional ESLint exceptions. No JSDoc conventions in use.
## Forbidden

<!-- Team-specific forbidden patterns -->

## Mandated

<!-- Team-specific mandates -->

## Corrections

<!-- Self-learning loop appends here. -->
