# Observability Setup — Questions

**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17

> All questions answered from project context (PoC on Vercel, no prior infrastructure design).

---

**Q1: What monitoring platform is available?**

[Answer]: Vercel built-in function logs and analytics (included with all plans).
No AWS CloudWatch, Datadog, or Grafana configured for this PoC.

---

**Q2: What SLO targets are appropriate?**

[Answer]: ≥ 99.0% availability (7-day window), p95 latency ≤ 2 s on cache hit.
Conservative targets appropriate for a PoC with no on-call rotation.

---

**Q3: Is distributed tracing needed?**

[Answer]: No. Single server-to-server fan-out (Himalayas + Remotive in parallel).
Vercel function duration logs are sufficient for latency diagnosis.

---

**Q4: Is automated anomaly detection needed?**

[Answer]: No. Traffic volume is too low for meaningful ML baselines. Manual log
monitoring is sufficient for PoC. Recommendations for post-PoC tooling documented.

---

**Q5: What constitutes an observable incident for this app?**

[Answer]: HTTP 502 (both sources down, no cache) or p95 > 10 s. For a PoC,
detection is via manual smoke test or Vercel deployment failure notification.
