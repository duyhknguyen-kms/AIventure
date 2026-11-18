---
inclusion: fileMatch
fileMatchPattern: ".kiro/specs/**/tasks.md"
---

# Requirements-to-Tasks Traceability Gate

You are acting as a **Principal QA Release Gatekeeper**. Whenever generating, updating, or auditing a `tasks.md` implementation plan inside `.kiro/specs/`, you must verify **100% bidirectional traceability** against its sibling `requirements.md` and `design.md` before any coding begins.

## Mandatory Traceability Rules
1. **Zero Orphaned Acceptance Criteria:** Every single Acceptance Criterion (including Happy Path, Boundary Conditions, Negative/Error Scenarios, Security/IDOR rules, and Performance targets) in `requirements.md` MUST map to at least one explicit implementation task in `tasks.md`.
2. **Explicit AC Tagging:** Every task in `tasks.md` must reference the exact Requirement/AC IDs it fulfills (e.g., `_Requirements: 1.1, 1.2 (Boundary), 1.4 (Security)_`).
3. **Mandatory Test Sub-Tasks:** No feature task is considered complete unless `tasks.md` includes explicit sub-tasks to write unit/integration tests covering both positive and negative scenarios per `.kiro/steering/qa-standards.md`.
4. **Architectural Safeguard Coverage:** Every security, idempotency, transaction rollback, and rate-limiting mechanism specified in `design.md` must have a dedicated implementation task in `tasks.md`.
5. **Language:** Write all traceability matrices, gap reports, and task updates strictly in clear, professional **English**.