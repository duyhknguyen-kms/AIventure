// §7.2 — Scoring weights (must sum to 100)
export const WEIGHTS = {
  skills:     30,
  title:      20,
  seniority:  10,
  salary:     15,
  employment:  5,
  timezone:    5,
  benefits:   15,
} as const satisfies Record<string, number>;

// Verify at module load — caught by the unit test and by import itself.
const weightSum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
if (weightSum !== 100) {
  throw new Error(`WEIGHTS must sum to 100, got ${weightSum}`);
}

// §5.5 — Cache
export const DEFAULT_CACHE_TTL_SECONDS = 21_600; // 6 h
export const DEFAULT_HIMALAYAS_MAX_PAGES = 5;    // 5 × 20 = up to 100 jobs

// §5.1 — Himalayas
export const HIMALAYAS_PAGE_SIZE = 20;
export const HIMALAYAS_BROWSE_URL = "https://himalayas.app/jobs/api";
export const HIMALAYAS_SEARCH_URL = "https://himalayas.app/jobs/api/search";

// §5.2 — Remotive
export const REMOTIVE_URL = "https://remotive.com/api/remote-jobs";

// §6 — Criteria
export const CRITERIA_STORAGE_KEY = "aiventure.criteria.v1";
