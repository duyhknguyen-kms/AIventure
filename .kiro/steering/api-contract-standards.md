---
inclusion: fileMatch
fileMatchPattern: "src/{api,routes,controllers,schemas}/**/*.ts"
---

# API Contract & Backward-Compatibility Standards

Whenever creating or modifying API endpoints, request/response DTOs, or OpenAPI specifications, you must enforce strict **Consumer-Driven Contract** rules so Frontend, Mobile, and external consumers never break unexpectedly.

## Mandatory API Contract Rules
1. **Additive-Only Evolution:** Never rename, delete, or narrow the data type of an existing response field on an active API version. Mark deprecated fields with `@deprecated` in JSDoc/OpenAPI while keeping them populated until the next major version (`/v2/`).
2. **Explicit Schema Validation:** Every endpoint must define explicit Request and Response schemas (e.g., via Zod or OpenAPI) and validate response payloads in automated tests so accidental field drops fail immediately.
3. **Status Code Stability:** Do not change existing HTTP status codes for established success or error paths (e.g., changing `200` to `201`, or `404` to `400`).
4. **Mandatory Contract Test Coverage:** Every modified endpoint in `src/api/**` must include a corresponding `*.contract.test.ts` (or schema validation assertion block) verifying:
   - Exact response JSON keys and data types (`200`/`201` payloads).
   - Standard error envelope structure (`400`, `401`, `403`, `404`, `422`).
   - Backward compatibility with existing client payloads (optional new fields must have safe defaults).
5. **Language:** Write all contract tests, schema descriptions, and compatibility warnings in clear **English**.