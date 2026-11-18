# Requirements Analysis Questions

**Stage:** requirements-analysis
**Intent:** 261118-ai-job-enhancement
**Date:** 2026-11-18

Answering the way you chose earlier: I'll edit the file. Say if you'd rather be guided through them here or chat.

---

## Q1: Skills dictionary — static or LLM-driven? (FR1.1)

The existing `skills-dictionary.ts` has ~120 entries. We can expand it as a static file, or replace the lookup with an LLM call that extracts skills from free text.

A. Expand the static dictionary (simple, offline, no API cost)
B. Use LLM to extract skills dynamically (higher recall, requires API key)
C. Both — expanded static dictionary as fallback, LLM when available
X. Other (please specify)

[Answer]:

---

## Q2: Which LLM provider? (FR1.2, FR2)

The requirements are written provider-agnostically. The provider shapes the SDK, pricing, and privacy constraints.

A. OpenAI (GPT-4o or GPT-4o-mini)
B. Anthropic (Claude Haiku or Sonnet)
C. Local model via Ollama (no API cost, fully private, requires local GPU/CPU)
D. Other (please specify)
X. Not decided yet — lock in at Domain Design

[Answer]:

---

## Q3: Where do LLM calls run? (FR1.2, FR2, NFR2)

CV parsing today runs entirely in the browser (privacy-first). LLM calls could run client-side (using a browser-compatible SDK) or server-side (via a new Next.js API route that proxies the LLM).

A. Server-side proxy — LLM API key stays server-only; CV text sent to server (user must opt in for CV extraction)
B. Client-side — user provides their own API key in the UI; nothing touches our server
C. Server-side for job scoring (no PII involved), client-side for CV extraction (opt-in for server)
X. Other (please specify)

[Answer]:

---

## Q4: Hybrid scoring blend weight (FR2.1)

In hybrid mode, `matchPercent = α × deterministicScore + (1−α) × aiScore`. What should the default α be, and can users adjust it?

A. α = 0.5 (equal blend), not adjustable in the UI
B. α = 0.3 (AI-weighted 70%), not adjustable
C. α = 0.5, with a UI slider so users can tune it
D. No blending — AI score replaces the deterministic score entirely when enabled
X. Other (please specify)

[Answer]:

---

## Q5: Data-residency or privacy constraint on LLM provider? (FR2.4)

Do you have any requirement that restricts where data (job descriptions, CV text) is processed?

A. No constraint — any reputable provider is fine
B. EU data residency required (affects provider choice)
C. No third-party cloud — local/self-hosted models only
X. Other (please specify)

[Answer]:

---

## Q6: Property-based testing library (FR3.2)

Vitest supports `fast-check` for property-based tests. Is there a preference?

A. Use `fast-check` (well-maintained, TypeScript-native, Vitest plugin available)
B. Skip property-based tests for now — golden dataset tests are sufficient
C. Other library (please specify)
X. No preference — use whatever integrates cleanest

[Answer]:

---

## Q7: Monthly LLM budget ceiling (NFR3)

To bound API spend, NFR3 proposes a per-session cap of 50 LLM calls. Is there a monthly dollar ceiling to design around?

A. No hard ceiling — keep the per-session cap of 50 calls as the only control
B. Under $10/month (hobby/personal use)
C. Under $50/month (small team)
D. No budget constraint — optimise for quality, not cost
X. Other (please specify)

[Answer]:
