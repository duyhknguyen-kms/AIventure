# Component Inventory — AIventure

All components are React client components (`"use client"`). None perform data fetching — they receive data via props. MUI v9 (`@mui/material`) is the UI foundation for all components.

---

## Page Shell

### `src/app/page.tsx` — `HomePage`

The single Next.js page; acts as the top-level state container and orchestrator.

**Props:** none (Next.js page component)

**Responsibilities:**
- Fetches `/api/jobs` on mount and on manual refresh.
- Holds `rawJobs`, `criteria`, `loading`, `fetchError`, `sources`, `selectedJob` in state.
- Runs `rankJobs(rawJobs, criteria)` in a `useMemo` — no network call, pure re-rank.
- Renders the full page layout: sticky `AppBar`, mobile criteria `Drawer`, `SourceStatusBanner`, `JobList`, `JobDetailPanel`, footer.
- Passes `onAnnounce` callback to `JobList` → `LiveAnnouncer`.

**Accessibility notes:**
- `<html lang="en">` set in `layout.tsx`.
- `<Container id="main">` as the skip-link target.
- `AppBar` uses `component="header"`.
- Criteria sidebar uses `component="aside" aria-label="Job criteria"`.

---

## Layout

### `src/app/layout.tsx` — `RootLayout`

**Props:** `{ children: React.ReactNode }`

Sets `<html lang="en">`, loads Roboto via `next/font/google`, wraps in `AppRouterCacheProvider`, `ThemeProvider`, and `CssBaseline`.

**Accessibility notes:**
- `viewport` meta: `width=device-width, initialScale=1` — no `maximumScale` or `userScalable` lock (WCAG 1.4.4).

---

## Forms and Input

### `src/components/CriteriaForm.tsx` — `CriteriaForm`

**Props:**
```typescript
{ criteria: Criteria; onChange: (next: Criteria) => void }
```

Renders all criteria fields: skills/keywords chips, target titles chips, excluded keywords chips, seniority checkboxes, employment type checkboxes, salary (amount + currency), country autocomplete, UTC offset select, must-have benefits checkboxes, nice-to-have benefits checkboxes, Reset button.

Embeds `<CvScanner>` at the top.

**Accessibility notes:**
- All checkbox groups wrapped in `<FormControl component="fieldset">` with `<FormLabel component="legend">` (WCAG 1.3.1).
- Every control has a visible label.
- Reset shows a MUI `Dialog` with confirm/cancel before clearing state.
- Salary validation: inline `helperText` error; `type="number"` with `min=0`.

---

### `src/components/CvScanner.tsx` — `CvScanner`

**Props:**
```typescript
{ criteria: Criteria; onChange: (next: Criteria) => void }
```

Renders a file-upload button (hidden `<input type="file" accept=".pdf,.docx">`). On file selection, calls `parseCv(file)` then `extractCriteriaFromText(text)`. Shows a preview `Dialog` with checkboxes for each detected skill, title, and seniority level. User confirms or cancels; on confirm, `mergeExtracted()` is called and `onChange` fires.

**States:** `parsing` (shows spinner), `parseError` (shows Alert), `extracted` (opens Dialog).

**Accessibility notes:**
- Button has `aria-busy={parsing}`.
- File input has `aria-label="Upload CV"`.
- Dialog uses `aria-labelledby` on `DialogTitle`.
- File can be re-uploaded (input value reset after each selection).

---

## Job Display

### `src/components/JobList.tsx` — `JobList`

**Props:**
```typescript
{
  ranked: (Job & { match: MatchResult })[];
  excluded: { job: Job; reason: string }[];
  mustHave?: BenefitKey[];
  keywords?: string[];
  targetTitles?: string[];
  loading?: boolean;
  onJobClick: (job: Job) => void;
  onAnnounce?: (msg: string) => void;
}
```

Renders a paginated list of `JobCard` components (10 per page) with a sort selector (Match %, Newest, Salary). Shows a loading skeleton when `loading=true`. Shows an excluded-jobs toggle with reason strings when any jobs are filtered out.

**Pagination:** MUI `Pagination` with `showFirstButton`/`showLastButton`. Page changes scroll `#main` into view and call `onAnnounce` with `"Page N of M, showing jobs X–Y"`.

**Accessibility notes:**
- Loading state: `aria-busy="true"` on the list container.
- Result list: `component="ul"` with `<li>` wrappers on `JobCard`.
- Sort control: `<InputLabel>` + `<Select>` with `labelId`.
- Pagination: `aria-label="Job results pages"`.

---

### `src/components/JobCard.tsx` — `JobCard`

**Props:**
```typescript
{
  job: Job;
  match: MatchResult;
  mustHave?: BenefitKey[];
  keywords?: string[];
  targetTitles?: string[];
  onClick: (job: Job) => void;
}
```

MUI `Card` with `CardActionArea` (triggers `onClick`), company `Avatar` (image or initials fallback), job title wrapped in `HighlightText`, company name, salary summary chip, location summary, `BenefitChips`, and `SourceAttribution` below the action area.

Match level chip: green ≥75%, amber ≥50%, red <50%; label always includes text ("Strong match", "Medium match", "Low match") — never colour alone.

**Accessibility notes:**
- `<Card component="li">` to form a proper list with `JobList`'s `<ul>`.
- `CardActionArea` has `aria-label="{title} at {company}, {pct}% {level}"`.
- `SourceAttribution` link is outside `CardActionArea` to avoid nested interactive elements (WCAG 4.1.3).
- Company `Avatar`: `alt="{company} logo"`.

---

### `src/components/JobDetailPanel.tsx` — `JobDetailPanel`

**Props:**
```typescript
{
  job: Job | null;
  match: MatchResult | null;
  mustHave?: BenefitKey[];
  keywords?: string[];
  targetTitles?: string[];
  excludedKeywords?: string[];
  open: boolean;
  onClose: () => void;
}
```

MUI `Dialog` (`maxWidth="md"`, `scroll="paper"`) showing full job details: match chip, salary chip, `ScoreBreakdown`, detected benefits with `BenefitChips` and evidence blockquotes, description as `descriptionText` (never `dangerouslySetInnerHTML`) wrapped in `HighlightText`, source attribution, `alsoOn` links, Apply button.

**Accessibility notes:**
- `aria-labelledby` on Dialog points to `DialogTitle`.
- Close `IconButton` has `aria-label="Close job details"`.
- Apply button: `aria-label="Apply for {title} (opens in new tab)"`.
- Description `<Typography>` with `whiteSpace: pre-line` and `maxHeight` scroll.

---

### `src/components/ScoreBreakdown.tsx` — `ScoreBreakdown`

**Props:**
```typescript
{ factors: FactorResult[]; matchPercent: number }
```

MUI `Table` with one row per scoring factor. Each row shows: factor name, a `LinearProgress` bar (active factors) or "not set" text (inactive factors), points/weight label, detail string.

**Accessibility notes:**
- `aria-label="Match score breakdown"` on `<Table>`.
- `<caption>` element present (WCAG 1.3.1).
- `LinearProgress` has `aria-label`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.
- `<TableCell component="th" scope="row">` for row headers.

---

### `src/components/BenefitChips.tsx` — `BenefitChips`

**Props:**
```typescript
{ benefits: DetectedBenefit[]; mustHave?: BenefitKey[] }
```

Renders MUI `Chip` for each detected benefit. Must-have benefits use `color="success"` with a checkmark icon and filled variant. Missing must-have benefits are shown as outlined, dimmed chips with an empty-circle icon.

**Accessibility notes:**
- Icon props use `aria-hidden="true"` (icons are decorative).
- Text label present on all chips.

---

## Text Utilities

### `src/components/HighlightText.tsx` — `HighlightText`

**Props:**
```typescript
{
  text: string;
  terms?: string[];        // Primary highlight (warning.light background)
  warnTerms?: string[];    // Warning highlight (error.light background)
  component?: React.ElementType;
}
```

Splits `text` into plain/match/warn segments using word-boundary regex (same hyphen-normalisation as the matching engine). Renders highlighted segments in `<mark>` elements with `bgcolor` and `fontWeight: 700`. Longest terms match first (sorted).

**Accessibility notes:**
- Colour is never the only distinguishing attribute (WCAG 1.4.1) — bold weight is also applied.
- Visually-hidden `"Contains highlighted matches."` prefix is prepended when any highlights exist, for screen readers that do not announce `<mark>`.

---

## Status and Feedback

### `src/components/SourceStatusBanner.tsx` — `SourceStatusBanner`

**Props:**
```typescript
{ sources: SourceStatus[]; onRetry: () => void }
```

Shows a MUI `Alert` (warning or error) when any source has `ok: false`. Lists degraded sources with error strings and cached-data notices. Includes a "Retry" button that calls `onRetry`.

Returns `null` when all sources are healthy.

---

### `src/components/LiveAnnouncer.tsx` — `LiveAnnouncer`

**Props:**
```typescript
{ message: string }
```

Visually-hidden `role="status"` region with `aria-live="polite"` and `aria-atomic="true"`. Updates are debounced 500 ms to avoid spamming screen readers during rapid re-rankings.

---

### `src/components/SourceAttribution.tsx` — `SourceAttribution`

**Props:**
```typescript
{ job: Pick<Job, "source" | "sourceUrl" | "title"> }
```

Renders a caption-sized "Source: Himalayas" / "Source: Remotive" link with an `OpenInNew` icon. `aria-label` includes the job title and "(opens in new tab)".

---

### `src/components/SkipLink.tsx` — `SkipLink`

No props.

Renders a visually-hidden-until-focused "Skip to job results" link targeting `#main`. First focusable element in the DOM (WCAG 2.4.1).

---

## Custom Hook

### `src/hooks/useCriteria.ts` — `useCriteria`

**Signature:** `() => [Criteria, (next: Criteria) => void]`

- Reads `localStorage["aiventure.criteria.v1"]` on mount (SSR-safe: `useEffect`).
- Validates with `CriteriaSchema.safeParse`; falls back to `DEFAULT_CRITERIA` on failure.
- Writes back on change, debounced 300 ms.
- Returns `[criteria, setCriteria]`.

---

## Component Summary Table

| Component | File | Lines (approx) | Key MUI primitives |
|-----------|------|----------------|--------------------|
| `HomePage` | `app/page.tsx` | ~140 | `AppBar`, `Drawer`, `Grid`, `Container` |
| `CriteriaForm` | components/ | ~270 | `Autocomplete`, `Checkbox`, `Select`, `TextField` |
| `CvScanner` | components/ | ~170 | `Dialog`, `Button`, `Checkbox`, `Alert` |
| `JobList` | components/ | ~140 | `Pagination`, `Select`, `Skeleton`, `Stack` |
| `JobCard` | components/ | ~90 | `Card`, `Chip`, `Avatar`, `CardActionArea` |
| `JobDetailPanel` | components/ | ~130 | `Dialog`, `Button`, `Chip`, `LinearProgress` |
| `ScoreBreakdown` | components/ | ~70 | `Table`, `LinearProgress` |
| `BenefitChips` | components/ | ~50 | `Chip`, `Stack` |
| `HighlightText` | components/ | ~90 | `Box` (as `mark`) |
| `SourceStatusBanner` | components/ | ~50 | `Alert`, `AlertTitle` |
| `LiveAnnouncer` | components/ | ~35 | `Box` |
| `SourceAttribution` | components/ | ~30 | `Link`, `Typography` |
| `SkipLink` | components/ | ~30 | `Link` |
