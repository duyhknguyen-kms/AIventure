/**
 * Deterministic CV/resume parser (no AI/LLM).
 *
 * Extracts skill keywords, job title suggestions, and seniority level from
 * plain CV text using keyword matching and regex patterns. All matches are
 * case-insensitive.
 */

import type { Seniority } from "@/lib/types";

export interface CvExtraction {
  /** Skills/keywords to pre-fill in the criteria form. */
  keywords: string[];
  /** Suggested target job titles extracted from the CV. */
  targetTitles: string[];
  /** Detected seniority levels. */
  seniority: Seniority[];
  /** Raw extracted text, so the user can inspect it. */
  rawText: string;
  /** Count of characters actually read (useful for large files). */
  charCount: number;
}

// ─── Skill / keyword dictionary ──────────────────────────────────────────────

const TECH_SKILLS: readonly string[] = [
  // Languages
  "JavaScript", "TypeScript", "Python", "Java", "Go", "Rust", "Ruby", "PHP",
  "Swift", "Kotlin", "C++", "C#", "Scala", "Elixir", "Dart", "R",
  // JS/TS Ecosystem
  "React", "Next.js", "Vue", "Nuxt", "Angular", "Svelte", "SolidJS",
  "Node.js", "Express", "NestJS", "Fastify", "Hapi",
  "Redux", "Zustand", "MobX", "Recoil", "React Query", "SWR",
  "GraphQL", "Apollo", "tRPC", "REST", "WebSocket",
  "Webpack", "Vite", "esbuild", "Rollup", "Parcel",
  "Jest", "Vitest", "Playwright", "Cypress", "Testing Library",
  // Python Ecosystem
  "Django", "FastAPI", "Flask", "SQLAlchemy", "Pandas", "NumPy",
  "PyTorch", "TensorFlow", "scikit-learn", "Celery",
  // Backend / API
  "Spring Boot", "Rails", "Laravel", "ASP.NET", "gRPC",
  "OAuth", "JWT", "REST API", "OpenAPI", "Swagger",
  // Data / DB
  "PostgreSQL", "MySQL", "SQLite", "MongoDB", "Redis",
  "Elasticsearch", "Cassandra", "DynamoDB", "Firebase",
  "Prisma", "TypeORM", "Hibernate", "GORM",
  "SQL", "NoSQL",
  // Cloud / DevOps
  "AWS", "GCP", "Azure", "Vercel", "Netlify", "Render", "Railway",
  "Docker", "Kubernetes", "Helm", "Terraform", "Pulumi",
  "GitHub Actions", "GitLab CI", "CircleCI", "Jenkins",
  "Nginx", "Apache", "Cloudflare",
  // Tools
  "Git", "Linux", "Bash", "Zsh", "macOS",
  "Figma", "Storybook", "Chromatic",
  // Architecture / concepts
  "microservices", "monorepo", "event-driven", "serverless",
  "CI/CD", "TDD", "DDD", "SOLID", "clean architecture",
  "WebAssembly", "WASM",
  // Mobile
  "React Native", "Flutter", "iOS", "Android",
  // Data / Analytics
  "Kafka", "RabbitMQ", "NATS", "BigQuery", "Snowflake", "dbt",
  // Security
  "OWASP", "penetration testing", "security", "cryptography",
  // Design / UI
  "MUI", "Material UI", "Tailwind", "CSS", "Sass", "styled-components",
  "Emotion", "Radix UI", "Shadcn", "Chakra UI", "Ant Design",
  // AI / ML
  "LLM", "RAG", "LangChain", "OpenAI", "Anthropic", "vector database",
  "machine learning", "deep learning", "NLP",
];

// Pre-compute lowercase map for fast lookup
const SKILL_LOWER_MAP: Map<string, string> = new Map(
  TECH_SKILLS.map((s) => [s.toLowerCase(), s])
);

// Also match common short aliases
const SKILL_ALIASES: Readonly<Record<string, string>> = {
  "js": "JavaScript",
  "ts": "TypeScript",
  "py": "Python",
  "k8s": "Kubernetes",
  "k8": "Kubernetes",
  "psql": "PostgreSQL",
  "pg": "PostgreSQL",
  "mongo": "MongoDB",
  "tf": "Terraform",
  "gh actions": "GitHub Actions",
  "node": "Node.js",
  "next": "Next.js",
};

// ─── Title patterns ───────────────────────────────────────────────────────────

const TITLE_PATTERNS: readonly RegExp[] = [
  // "Frontend Developer", "Backend Engineer", "Full Stack Developer"
  /\b(?:frontend|back[- ]end|full[- ]?stack|mobile|web|platform|infrastructure|data|cloud|devops|mlops|site reliability|sre|staff|principal|lead)\s+(?:software\s+)?(?:developer|engineer|architect|programmer|specialist)\b/gi,
  // "Software Engineer", "Software Developer"
  /\b(?:software|application|systems?|solutions?)\s+(?:developer|engineer|architect|programmer)\b/gi,
  // "React Developer", "Node.js Engineer"
  /\b(?:react|vue|angular|node(?:\.js)?|python|java(?:script)?|type(?:script)?|go|rust|ruby|php|swift|kotlin)\s+(?:developer|engineer)\b/gi,
  // "Engineering Manager", "Head of Engineering", "VP of Engineering"
  /\b(?:engineering|product|technology|tech)\s+(?:manager|lead|director|head|vp|vice president)\b/gi,
  /\b(?:head|director|vp|vice president|chief)\s+of\s+(?:engineering|technology|product|design|data)\b/gi,
  // "CTO", "CIO", "CPO"
  /\b(?:cto|cio|cpo|cso|chief\s+(?:technology|information|product|security)\s+officer)\b/gi,
  // "DevOps Engineer", "Cloud Architect"
  /\b(?:devops|cloud|platform|infrastructure|security|data|ml|ai|machine learning)\s+(?:engineer|architect|analyst|scientist|specialist)\b/gi,
  // "UX Designer", "Product Designer"
  /\b(?:ux|ui|product|graphic|web|brand)\s+designer\b/gi,
  // "Data Scientist", "Data Analyst", "Data Engineer"
  /\b(?:data|analytics|business intelligence|bi|research)\s+(?:scientist|analyst|engineer|architect)\b/gi,
  // "QA Engineer", "Test Engineer"
  /\b(?:qa|quality assurance|test(?:ing)?|automation)\s+(?:engineer|lead|analyst|specialist)\b/gi,
];

// ─── Seniority patterns ───────────────────────────────────────────────────────

const SENIORITY_REGEX: Readonly<Record<Seniority, RegExp>> = {
  executive: /\b(?:cto|ceo|cfo|cpo|chief\s+\w+|vp\s+of|vice\s+president)\b/i,
  director: /\b(?:director|head\s+of)\b/i,
  manager: /\bmanager\b/i,
  senior: /\b(?:senior|sr\.?|lead|principal|staff)\b/i,
  entry: /\b(?:junior|jr\.?|entry[- ]?level?|graduate|intern(?:ship)?|trainee|associate)\b/i,
  mid: /\b(?:mid[- ]?level?|intermediate|ii)\b/i,
};

const EXPERIENCE_YEAR_RE = /(\d+)\+?\s*years?\s+(?:of\s+)?(?:(?:professional|work(?:ing)?|industry|relevant)\s+)?experience/gi;

function yearsToSeniority(years: number): Seniority | null {
  if (years >= 10) return "senior";
  if (years >= 7) return "senior";
  if (years >= 4) return "mid";
  if (years >= 2) return "mid";
  return "entry";
}

// ─── Extraction helpers ───────────────────────────────────────────────────────

function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();

  for (const [lc, canonical] of SKILL_LOWER_MAP) {
    // Word-boundary check using simple surrounding character test
    const idx = lower.indexOf(lc);
    if (idx === -1) continue;
    const before = idx > 0 ? lower[idx - 1] : " ";
    const after = idx + lc.length < lower.length ? lower[idx + lc.length] : " ";
    const wordChar = /[a-z0-9]/;
    if (!wordChar.test(before) && !wordChar.test(after)) {
      found.add(canonical);
    }
  }

  for (const [alias, canonical] of Object.entries(SKILL_ALIASES)) {
    const re = new RegExp(`\\b${alias}\\b`, "i");
    if (re.test(text)) found.add(canonical);
  }

  return [...found].slice(0, 30); // Respect criteria max
}

function extractTitles(text: string): string[] {
  const found = new Set<string>();

  for (const pattern of TITLE_PATTERNS) {
    const matches = text.matchAll(pattern);
    for (const m of matches) {
      const title = m[0].replace(/\s+/g, " ").trim();
      // Normalise to title case
      const normalised = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
      found.add(normalised);
      if (found.size >= 10) break;
    }
    if (found.size >= 10) break;
  }

  return [...found].slice(0, 10);
}

function extractSeniority(text: string): Seniority[] {
  const found = new Set<Seniority>();

  for (const [level, re] of Object.entries(SENIORITY_REGEX) as [Seniority, RegExp][]) {
    if (re.test(text)) found.add(level);
  }

  // Years of experience
  for (const m of text.matchAll(EXPERIENCE_YEAR_RE)) {
    const years = parseInt(m[1], 10);
    const level = yearsToSeniority(years);
    if (level) found.add(level);
  }

  // If nothing detected, leave empty (every job matches)
  return [...found];
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parses plain CV text and returns structured extraction.
 * All logic is deterministic (no LLM/AI).
 */
export function parseCv(text: string): CvExtraction {
  const keywords = extractSkills(text);
  const targetTitles = extractTitles(text);
  const seniority = extractSeniority(text);

  return {
    keywords,
    targetTitles,
    seniority,
    rawText: text.slice(0, 10_000), // cap for display
    charCount: text.length,
  };
}
