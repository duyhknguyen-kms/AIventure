# Practices Discovery Questions

**Stage:** practices-discovery  
**Intent:** 261118-ai-job-enhancement  
**Project type:** Brownfield (existing AIventure codebase)

---

## Q1: How does your team merge work? (Way of Working)

The codebase shows feature branches merging into `main` via PRs. A few things to confirm:

A. Squash-merge — one commit per PR, keeps main history linear  
B. Regular merge commit — preserves branch history  
C. Rebase + fast-forward  
X. Other (please specify)

[Answer]: B

**Follow-up:** Do you require any branch protection rules — e.g., required reviews, passing status checks before merge?

[Answer]: No

---

## Q2: Should we build a thin end-to-end slice first? (Walking Skeleton)

A walking skeleton is a minimal version that runs the whole way through, built first to prove the pieces connect before the real features go in. For this AI-enhancement intent (CV parsing, AI matching, QA validation added to an existing working app):

A. Yes — build a thin integration slice first (e.g., one LLM call wired end-to-end) before the full feature work  
B. No — the existing app already proves integration; build feature by feature  
X. Other (please specify)

[Answer]: B

---

## Q3: How strict is the test coverage target? (Testing Posture)

The existing suite has 289 tests but no enforced line-coverage floor in CI. The org default is 80% for feature/MVP scopes. For this classic-scope intent:

A. Enforce 80% line-coverage in CI — any PR dropping below fails  
B. Keep existing suite green — no numeric floor, rely on new tests being added per requirement  
C. Enforce a different threshold (please specify)  
X. Other (please specify)

[Answer]: A

**Follow-up:** `parseCv.ts` already has an untestable gap (pdfjs-dist dynamic import). As CV parsing is extended with LLM calls, should LLM calls be tested with mocked responses, or skipped from coverage?

[Answer]: 

---

## Q4: What is the deployment target for this enhancement? (Deployment)

A. CI only — build, lint, test; no CD pipeline; deploy manually  
B. Add a CD pipeline — auto-deploy to staging on merge to main  
C. Containerise and deploy to a cloud environment (specify target)  
X. Other (please specify)

[Answer]:None

---

## Q5: Is a code formatter configured for this project? (Code Style)

The codebase uses ESLint but no Prettier config file was found in the repo. 

A. No formatter — ESLint only (keep as-is)  
B. Add Prettier — configure it now and enforce in CI  
C. Prettier is already set up but not committed — I'll add the config  
X. Other (please specify)

[Answer]: no need now
