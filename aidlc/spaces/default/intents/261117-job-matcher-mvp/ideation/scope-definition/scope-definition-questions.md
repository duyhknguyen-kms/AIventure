# Scope Definition — Questions & Answers

Stage: scope-definition  
Intent: 261117-job-matcher-mvp  
Date: 2026-11-17

> **Note:** This stage ran against a fully delivered project. All questions are answered from
> `SPEC.md`, `PROGRESS.md`, `README.md`, and `user-story.md` rather than from a human session.

---

**Q1: What is the minimum viable scope that delivers value?**

[Answer]: A job seeker can open the app, immediately see remote jobs from two sources,
and filter them by their own skills, salary floor, and location — with a match percentage
explaining why each job ranked where it did. This core loop (fetch → filter → score → display)
is the minimum. Everything else (CV scan, pagination, highlight text) adds comfort but is not
required for the product to be useful on first visit.

---

**Q2: What capabilities are must-have vs. nice-to-have?**

[Answer]:

Must-have (product is unusable without them):
- Multi-source job feed with deduplication
- Deterministic 7-factor matching engine
- Hard filters: location, excluded keywords, salary floor
- Criteria persistence (localStorage)
- Source attribution on every card and in every detail panel

Should-have (painful to omit, workarounds exist):
- Job detail panel with score breakdown
- Benefit detection with evidence snippets
- Match badge (number + text level)

Could-have (desirable, included if time allows):
- Pagination (limits DOM size, improves perceived performance)
- Highlight matched terms
- CV scan to auto-fill criteria

Won't-have (this release):
- Authentication / saved profiles
- AI/LLM-based scoring (explicitly deferred to a later phase)
- Push notifications
- Google Jobs / LinkedIn Jobs submission
- Server-side rendered job pages for SEO

---

**Q3: What are the dependencies between capabilities?**

[Answer]:

```
Sources (Himalayas + Remotive)
  └─► Normalize (employment, seniority, location, salary, HTML)
        └─► Aggregate (cache + dedupe)
              └─► API route GET /api/jobs
                    └─► Matching engine (criteria → filters → score)
                          └─► Dashboard (JobList → JobCard)
                                └─► CriteriaForm + useCriteria
                                      └─► JobDetailPanel + ScoreBreakdown
```

CV scan depends on CriteriaForm being complete.
Pagination and HighlightText depend on JobList/JobCard being complete.
Benefit detection depends on HTML normalization (stripHtml).

---

**Q4: What is the sequencing preference (risk-first, value-first, dependency-first)?**

[Answer]: Dependency-first inside the data layer (sources → normalize → aggregate → API),
then value-first for the UI (dashboard before detail panel before criteria form),
then nice-to-have improvements last.

---

**Q5: Are there hard deadlines tied to specific capabilities?**

[Answer]: The stated outcome was a functional PoC MVP within 2 days (from SPEC.md §1).
The 8-stage build roadmap was designed to deliver a demoable state at each stage.
No external hard deadlines have been stated for future work.
