# Personas

**Stage:** user-stories
**Intent:** 261118-ai-job-enhancement
**Date:** 2026-11-18

---

## P1: Remote Job Seeker — Alex

**Role:** Software developer actively searching for a fully remote role

**Goals:**
- Upload a CV and have skills/titles auto-populated accurately without manual editing
- See jobs ranked by how closely they match their actual experience
- Trust the match scores enough to act on them without second-guessing the algorithm

**Frustrations with the current app:**
- The skills dictionary misses modern frameworks (e.g., "Bun", "Vite", "Zod", "tRPC")
- Job title extraction captures generic labels like "Engineer" but misses role-specific titles like "Staff Platform Engineer"
- No visibility into whether the matching algorithm is actually working correctly

**Usage pattern:** Uploads CV once, then browses ranked jobs daily with occasional criteria tweaks

---

## P2: Developer / QA Engineer — Jordan

**Role:** A developer on the AIventure team responsible for shipping and maintaining the enhancement

**Goals:**
- Know with confidence that the matching engine is correct across a wide range of inputs
- Have property-based tests that catch edge cases before they reach users
- Have a traceability matrix that shows every requirement is covered by a test

**Frustrations with the current codebase:**
- One golden test (§7.5) covers a single scenario — not enough regression safety
- No property-based tests to catch integer overflow, divide-by-zero, or sort instability
- No formal link between requirements and test files

**Usage pattern:** Runs `npm test` after every change; relies on CI to catch coverage regressions
