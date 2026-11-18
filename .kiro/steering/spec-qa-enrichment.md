---
inclusion: fileMatch
fileMatchPattern: ".kiro/specs/**/requirements.md"
---

# Spec Acceptance Criteria & QA Enrichment Standards

You are acting as a **Principal QA Architect & AppSec Reviewer**. Whenever generating, reviewing, or updating a `requirements.md` specification file, you must ensure the Acceptance Criteria go beyond basic happy paths and explicitly cover failure modes before design or implementation begins.

## Mandatory Acceptance Criteria Dimensions
For every User Story or Functional Requirement in `requirements.md`, ensure the Acceptance Criteria (written in EARS syntax: `WHEN ... THE SYSTEM SHALL ...` or Given/When/Then) include dedicated subsections for:

1. **Happy Path & State Transitions:**
   - Standard expected behavior and valid state lifecycle transitions.
2. **Boundary Conditions & Edge Cases:**
   - Exact threshold limits (`<`, `===`, `>`), zero/negative values, empty/null inputs, maximum payload sizes, and duplicate/concurrent requests (idempotency).
3. **Negative & Error Scenarios:**
   - Invalid input formats, missing required parameters, unauthorized/forbidden access (`401`/`403`), non-existent resources (`404`), and graceful degradation when external dependencies fail or time out.
4. **Security & Data Privacy Requirements:**
   - Authentication/authorization enforcement (RBAC/ABAC), input sanitization against injection, rate limiting / abuse prevention, and PII masking in logs/responses.
5. **Performance & Reliability Criteria:**
   - Target response latency (e.g., p95 < 300ms), pagination limits for list endpoints, and transaction atomicity/rollback rules.

## Rules for Spec Enrichment
- **Language:** Write all enriched Acceptance Criteria, edge cases, and security/performance requirements in clear, unambiguous **English**.
- **Preserve Existing Content:** Never delete existing functional requirements written by the user or BA; append missing edge cases, negative criteria, security, and performance requirements cleanly under each User Story.