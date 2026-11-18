# User Stories — AIventure
**Project:** AI Smart Job Aggregator & Matching Platform  
**Date:** 2026-11-17  
**Source:** SPEC.md · PROGRESS.md · README.md

---

## Epic 1 — Job Discovery

### US-01 · Browse ranked remote jobs without setup

**As a** remote job seeker,  
**I want to** open the app and immediately see a ranked list of remote jobs,  
**So that** I can get a useful starting point without configuring anything.

**Acceptance criteria:**

- **Given** I open the app for the first time with no criteria set,  
  **When** the page loads,  
  **Then** I see a list of remote jobs from at least one source, sorted by recency, with no match badge shown (no criteria are active yet).

- **Given** the job feed has loaded,  
  **When** I scroll through the list,  
  **Then** each card shows the job title, company, employment type, salary (if available), location summary, and source attribution.

- **Given** both Himalayas and Remotive are reachable,  
  **When** the page loads,  
  **Then** jobs from both sources appear, deduplicated by company + title.

---

### US-02 · See which source a job came from

**As a** job seeker,  
**I want to** know which site a job listing came from,  
**So that** I can click through to the original listing and trust the data.

**Acceptance criteria:**

- **Given** a job card is displayed,  
  **When** I look at the card,  
  **Then** I can see "Source: Himalayas" or "Source: Remotive" as a visible link.

- **Given** I click the source link,  
  **When** the link opens,  
  **Then** it takes me to the original listing on the source site in a new tab.

- **Given** a job appears on both Himalayas and Remotive,  
  **When** I open the detail panel,  
  **Then** I see an "Also on: Remotive" link crediting the duplicate source.

---

### US-03 · See a job's full details and Apply

**As a** job seeker,  
**I want to** read the full job description and apply directly,  
**So that** I can make an informed decision and apply without leaving the app.

**Acceptance criteria:**

- **Given** a job card is visible,  
  **When** I click it (or press Enter/Space),  
  **Then** a detail panel opens showing: title, company, salary, score breakdown, detected benefits with evidence quotes, and the full plain-text description.

- **Given** the detail panel is open,  
  **When** I click Apply,  
  **Then** the official application URL opens in a new tab — never rebuilt or replaced.

- **Given** the detail panel is open,  
  **When** I press Escape,  
  **Then** the panel closes and focus returns to the card I opened it from.

---

## Epic 2 — Personalised Matching

### US-04 · Set my skills and get a match percentage

**As a** developer looking for a React role,  
**I want to** enter my skills and see which jobs match them,  
**So that** I don't have to read every description to find relevant jobs.

**Acceptance criteria:**

- **Given** I type "react" in the Skills field and press Enter,  
  **When** the criteria are saved,  
  **Then** each job card shows a match badge (e.g. "75% · Medium match") with both a percentage and a text level.

- **Given** a keyword appears in a job's title or description,  
  **When** I open that job card or detail panel,  
  **Then** the matched keyword is visually highlighted in the text.

- **Given** I add 4 keywords and a job mentions 3 of them,  
  **When** the score is calculated,  
  **Then** the skills factor shows "3/4 skills" in the score breakdown.

---

### US-05 · Set a minimum salary and filter out low-paying jobs

**As a** job seeker with a salary floor,  
**I want to** exclude jobs that pay below my minimum,  
**So that** I don't waste time on roles I won't accept.

**Acceptance criteria:**

- **Given** I set min salary to 100,000 USD,  
  **When** a job has an annualised salary max below 100,000 USD (same currency),  
  **Then** that job is excluded and appears under "Show excluded (n)".

- **Given** a job has no salary listed,  
  **When** the salary floor filter runs,  
  **Then** the job is kept (benefit of the doubt) and scores 0.5 on the salary factor.

- **Given** a job's salary is in EUR and my floor is in USD,  
  **When** the filter runs,  
  **Then** the job is kept (currency mismatch is not an exclusion reason).

---

### US-06 · Exclude jobs with unwanted keywords

**As a** developer who doesn't want on-site work,  
**I want to** add "on-site" to my excluded keywords,  
**So that** jobs requiring physical presence are automatically hidden.

**Acceptance criteria:**

- **Given** I add "on-site" to Excluded keywords,  
  **When** a job description contains "on-site" or "on site" (hyphen-normalised),  
  **Then** that job is excluded with the reason `Excluded keyword: "on-site"`.

- **Given** an excluded job is hidden,  
  **When** I click "Show excluded (n)",  
  **Then** I see the excluded jobs listed with their reasons below the main results.

- **Given** an excluded keyword appears in a job's detail panel description,  
  **When** I open the panel,  
  **Then** the excluded term is highlighted in red.

---

### US-07 · Filter by location and work in my region

**As a** developer based in Vietnam,  
**I want to** set my country to VN and only see jobs I'm eligible for,  
**So that** I don't apply to jobs with US-only restrictions.

**Acceptance criteria:**

- **Given** I set country to VN,  
  **When** a job is restricted to US and CA only,  
  **Then** that job is excluded with a location reason.

- **Given** I set country to VN (APAC region),  
  **When** a job lists `regions: ["APAC"]`,  
  **Then** that job is kept.

- **Given** a Remotive job has an unparseable location,  
  **When** the location filter runs,  
  **Then** the job is kept with a "location uncertain" flag visible in the detail panel.

---

### US-08 · Set must-have benefits and see which jobs provide them

**As a** job seeker who requires health insurance and paid leave,  
**I want to** mark those benefits as must-haves,  
**So that** I can quickly see which jobs offer what I need.

**Acceptance criteria:**

- **Given** I mark "Health / Medical" and "Paid time off" as must-haves,  
  **When** a job description mentions "health insurance" and "unlimited PTO",  
  **Then** both benefits appear as filled green chips with a checkmark on the card.

- **Given** I have a must-have benefit set,  
  **When** a job doesn't mention that benefit,  
  **Then** an outlined chip shows the benefit as "missing" on the card.

- **Given** I open the job detail panel,  
  **When** a benefit was detected,  
  **Then** I see the evidence snippet (e.g. "…we offer health insurance for all full-time…") as a blockquote.

---

## Epic 3 — Criteria Management

### US-09 · My criteria survive a page reload

**As a** returning user,  
**I want** my saved skills and preferences to still be there when I come back,  
**So that** I don't have to re-enter them every session.

**Acceptance criteria:**

- **Given** I set keywords "react" and "typescript" and close the browser,  
  **When** I reopen the app,  
  **Then** those keywords are still set and the jobs are already ranked accordingly.

- **Given** my saved criteria fail validation (e.g. corrupted localStorage),  
  **When** the app loads,  
  **Then** it silently falls back to default empty criteria without an error.

---

### US-10 · Scan my CV to auto-fill my skills

**As a** job seeker with an up-to-date CV,  
**I want to** upload it and have my skills detected automatically,  
**So that** I don't have to type every keyword manually.

**Acceptance criteria:**

- **Given** I click "Scan CV" and upload a PDF or DOCX file,  
  **When** parsing completes,  
  **Then** a preview dialog shows detected skills, job titles, and seniority level as checkboxes.

- **Given** the preview is shown,  
  **When** I uncheck "php" and click "Apply to criteria",  
  **Then** only the checked items are merged into my criteria; existing criteria are not overwritten.

- **Given** I upload a scanned (image-only) PDF,  
  **When** parsing completes,  
  **Then** I see a clear error: "Could not read text from this PDF. Try a text-based version."

---

### US-11 · Reset my criteria to start fresh

**As a** user who wants to clear all filters,  
**I want** a Reset button that clears everything after a confirmation,  
**So that** I don't accidentally lose my settings.

**Acceptance criteria:**

- **Given** I have criteria set,  
  **When** I click "Reset criteria",  
  **Then** a confirmation dialog appears before anything changes.

- **Given** the confirmation dialog is open,  
  **When** I click "Reset",  
  **Then** all fields return to empty/default and jobs are re-ranked by recency.

- **Given** the confirmation dialog is open,  
  **When** I press Escape or click Cancel,  
  **Then** nothing changes.

---

## Epic 4 — Browsing & Navigation

### US-12 · Page through results

**As a** user browsing many jobs,  
**I want** to see 10 jobs per page with navigation,  
**So that** the page doesn't become overwhelming.

**Acceptance criteria:**

- **Given** there are more than 10 matching jobs,  
  **When** the list renders,  
  **Then** only 10 cards are shown and a pagination control appears below.

- **Given** I am on page 1 and click "Next",  
  **When** the page changes,  
  **Then** cards 11–20 are shown and a live announcement says "Page 2 of N, showing jobs 11–20".

- **Given** I change my criteria,  
  **When** the results update,  
  **Then** pagination resets to page 1 automatically.

---

### US-13 · Sort results by salary or recency

**As a** user who cares more about salary than match score,  
**I want to** sort by salary descending,  
**So that** the highest-paying roles appear first.

**Acceptance criteria:**

- **Given** jobs are displayed,  
  **When** I change the Sort dropdown to "Salary (high–low)",  
  **Then** jobs with higher annualised max salary appear first; jobs with no salary appear last.

- **Given** I sort by "Newest",  
  **When** the list re-orders,  
  **Then** jobs with the most recent published date appear first.

---

### US-14 · Use the app on mobile

**As a** user on a small screen,  
**I want** the criteria form to be accessible from a drawer,  
**So that** I can filter jobs without the form taking up half the screen.

**Acceptance criteria:**

- **Given** I open the app on a screen narrower than 900 px,  
  **When** the page loads,  
  **Then** the criteria sidebar is hidden and a "Criteria" button appears in the app bar.

- **Given** I tap the Criteria button,  
  **When** the drawer opens,  
  **Then** the full criteria form is accessible and usable by touch.

---

## Epic 5 — Reliability & Accessibility

### US-15 · See a warning when a source is unavailable

**As a** user,  
**I want to** know if a job source is down,  
**So that** I understand why I might be seeing fewer jobs than usual.

**Acceptance criteria:**

- **Given** Remotive fails to respond,  
  **When** the page loads,  
  **Then** a warning banner names the failed source and its error, with a Retry button.

- **Given** both sources fail and there is no cached data,  
  **When** the page loads,  
  **Then** an error message explains "All sources unavailable" with a Retry button.

- **Given** a source fails but stale cached data exists,  
  **When** the page loads,  
  **Then** the stale jobs are shown with a note "(showing cached data)".

---

### US-16 · Navigate entirely by keyboard

**As a** user who doesn't use a mouse,  
**I want** everything reachable and operable by keyboard,  
**So that** I can use the app without a pointing device.

**Acceptance criteria:**

- **Given** I land on the page,  
  **When** I press Tab once,  
  **Then** focus goes to the "Skip to job results" link first.

- **Given** focus is on a job card,  
  **When** I press Enter or Space,  
  **Then** the detail panel opens with focus moved inside it.

- **Given** the detail panel is open,  
  **When** I press Escape,  
  **Then** the panel closes and focus returns to the card that opened it.

- **Given** I use the criteria form,  
  **When** I Tab through every control,  
  **Then** every input, checkbox, and button is reachable with a visible focus ring.

---

## Summary

| ID | Story | Epic | Status |
|---|---|---|---|
| US-01 | Browse ranked jobs without setup | Job Discovery | ✅ Implemented |
| US-02 | See which source a job came from | Job Discovery | ✅ Implemented |
| US-03 | See full details and Apply | Job Discovery | ✅ Implemented |
| US-04 | Set skills and get match % | Personalised Matching | ✅ Implemented |
| US-05 | Set minimum salary floor | Personalised Matching | ✅ Implemented |
| US-06 | Exclude unwanted keywords | Personalised Matching | ✅ Implemented |
| US-07 | Filter by location / region | Personalised Matching | ✅ Implemented |
| US-08 | Must-have benefits | Personalised Matching | ✅ Implemented |
| US-09 | Criteria survive page reload | Criteria Management | ✅ Implemented |
| US-10 | Scan CV to auto-fill skills | Criteria Management | ✅ Implemented |
| US-11 | Reset criteria | Criteria Management | ✅ Implemented |
| US-12 | Paginate results (10/page) | Browsing & Navigation | ✅ Implemented |
| US-13 | Sort by salary or recency | Browsing & Navigation | ✅ Implemented |
| US-14 | Mobile drawer for criteria | Browsing & Navigation | ✅ Implemented |
| US-15 | Warning when source is down | Reliability & Accessibility | ✅ Implemented |
| US-16 | Full keyboard navigation | Reliability & Accessibility | ✅ Implemented |

**16 stories · 5 epics · All implemented and tested**
