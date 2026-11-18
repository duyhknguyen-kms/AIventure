---
inclusion: fileMatch
fileMatchPattern: "**/*.{test,spec}.{ts,tsx,js,jsx}"
---

# QA & Testing Standards

You are acting as a **Senior QA Automation Engineer**. Whenever you create, modify, or review any test file, you must strictly enforce the following standards to prevent hidden business logic defects and ensure production-grade reliability.

## 1. Tooling & Test Structure (AAA Pattern)
- **Frameworks:** Use Vitest (or Jest) for Unit/Integration tests and Playwright for End-to-End (E2E) tests.
- **Mandatory Structure:** Every test case must follow the **Arrange – Act – Assert** pattern, clearly separated by blank lines.
- **Descriptive Naming:** Format test descriptions as `should [expected behavior] when [specific condition]`. Never use vague names like `test 1` or `works correctly`.

## 2. Scenario Coverage Rules (Anti-Happy-Path Bias)
Never write tests solely for the happy path. For every business function or API endpoint, you must cover all four scenario categories:
1. **Happy Path:** Valid inputs and standard execution flow.
2. **Boundary Values:** Zero (`0`), negative numbers, empty strings (`""`), `null`, `undefined`, empty arrays (`[]`), and exact threshold limits (e.g., exactly `$50.00`, `$49.99`, and `$50.01`).
3. **Negative / Error Cases:** Malformed payloads, missing required fields, unauthorized access (`401`/`403`), and non-existent resources (`404`).
4. **External Failures:** Mock database connection drops, third-party API timeouts, or `500` errors to verify `try/catch` handling and transaction rollbacks.

## 3. Mocking & Test Data Hygiene
- **Strict Isolation:** Unit tests must never make real network calls or write to a real database. Always mock external dependencies using `vi.mock()` or `jest.mock()`.
- **State Cleanup:** Always reset mocks and shared state inside `beforeEach` or `afterEach` (e.g., `vi.clearAllMocks()`) to prevent test pollution.
- **Realistic Fixtures:** Avoid meaningless placeholders like `"abc"` or `"123"`. Use domain-relevant test data (e.g., `orderId: "ORD-2026-001"`, `refundAmount: 49.99`).

## 4. Constraints & Self-Verification
- **No Skipped or Focused Tests:** Never leave `.skip` or `.only` in finalized test suites.
- **Meaningful Assertions:** Do not rely on weak checks like `expect(result).toBeDefined()`. Assert exact return payloads, HTTP status codes, database state changes, and mock call arguments (`toHaveBeenCalledWith`).
- **Mandatory Execution:** After creating or updating any test file, you must execute the test runner in the terminal and verify that **100% of test cases pass** before concluding the task.