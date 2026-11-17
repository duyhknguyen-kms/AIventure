# Tracing Configuration

**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17  
**Platform:** Vercel (PoC)

---

## Current state

No distributed tracing is configured for this PoC. The application has a simple
request path with no microservices or message queues to trace:

```
Browser → Vercel Edge → Next.js /api/jobs → Himalayas API
                                           → Remotive API
```

There is exactly one server-to-server fan-out (the two upstream API calls run in
parallel via `Promise.allSettled`). The latency of each call is visible in Vercel
function duration logs.

---

## Implicit tracing already in place

Each request to `/api/jobs` produces a Vercel function invocation log entry with:
- Request duration (total server time)
- HTTP status
- Function name

This is sufficient to diagnose the two most common latency patterns:
- **Fast (< 100 ms):** cache hit — both sources served from memory
- **Slow (500 ms–2 s):** cache miss — upstream APIs called; duration dominated by network

---

## Post-PoC tracing recommendation

If the app grows to multiple services or the upstream call fan-out increases,
add [OpenTelemetry for Next.js](https://nextjs.org/docs/app/guides/open-telemetry):

```bash
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

Then configure a trace exporter (Jaeger, Honeycomb, or Datadog). This provides
per-request spans showing exactly which upstream call added latency.

---

## Correlation ID (manual)

For debugging a specific user-reported issue, the Vercel deployment ID in the
`x-vercel-deployment-id` response header identifies the exact function version
that handled the request. This can be used to filter logs in the Vercel dashboard.
