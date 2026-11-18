# Smoke Test Results

**Intent:** 261117-job-matcher-mvp  
**Date:** 2026-11-17  
**Environment:** Local dev server (http://localhost:3000)

> Production smoke tests (against the Vercel URL) will be recorded here after the
> first production deployment. The commands below are confirmed working against the local server.

---

## Local smoke tests — PASS ✅

### Test 1: Dashboard page returns HTTP 200

```bash
curl -s --ipv4 http://127.0.0.1:3000/ -o /dev/null -w "%{http_code}"
# → 200
```

**Result:** ✅ 200

---

### Test 2: `/api/jobs` returns valid JSON with jobs and sources

```bash
curl -s --ipv4 http://127.0.0.1:3000/api/jobs | python3 -c "
import json,sys; d=json.load(sys.stdin)
print('jobs:', len(d['jobs']))
print('sources:', [(s['name'], 'ok' if s['ok'] else 'fail') for s in d['sources']])
print('fetchedAt:', d['fetchedAt'])
"
```

**Result:** ✅  
- `jobs: 117` (100 Himalayas + 17 Remotive, deduplicated)
- `sources: [('himalayas', 'ok'), ('remotive', 'ok')]`
- `fetchedAt` present and valid ISO 8601

---

### Test 3: Second call served from cache

```bash
curl -s --ipv4 "http://127.0.0.1:3000/api/jobs" | python3 -c "
import json,sys; d=json.load(sys.stdin)
print('himalayas cached:', d['sources'][0]['cached'])
print('remotive cached:', d['sources'][1]['cached'])
"
```

**Result:** ✅  
- `himalayas cached: True`
- `remotive cached: True`

---

### Test 4: Invalid `q` param returns 400

```bash
curl -s --ipv4 "http://127.0.0.1:3000/api/jobs?q=$(python3 -c 'print("a"*101)')" -o /dev/null -w "%{http_code}"
# → 400
```

**Result:** ✅ 400

---

## Production smoke tests template

Run these after the first Vercel deployment, replacing `<URL>` with the production URL:

```bash
export URL=https://<your-vercel-url>

# 1. Dashboard
curl -sf $URL/ -o /dev/null -w "Dashboard: %{http_code}\n"

# 2. API
curl -sf $URL/api/jobs | python3 -c "
import json,sys; d=json.load(sys.stdin)
print('jobs:', len(d['jobs']), '| sources ok:', all(s['ok'] for s in d['sources']))
"

# 3. API key not in bundle (security)
grep -r 'HIMALAYAS_API_KEY' .vercel/output/ 2>/dev/null || echo 'PASS: key not in output'
```
