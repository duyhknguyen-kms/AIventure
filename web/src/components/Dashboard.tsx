"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Alert from "@mui/material/Alert";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import CloseIcon from "@mui/icons-material/Close";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import DescriptionIcon from "@mui/icons-material/Description";
import LightModeIcon from "@mui/icons-material/LightMode";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import TuneIcon from "@mui/icons-material/Tune";
import SpeedIcon from "@mui/icons-material/Speed";
import VerifiedIcon from "@mui/icons-material/Verified";
import WorkIcon from "@mui/icons-material/Work";
import Container from "@mui/material/Container";
import { CriteriaForm } from "@/components/CriteriaForm";
import { CategoryFilter } from "@/components/CategoryFilter";
import { ChatWidget } from "@/components/ChatWidget";
import { CVUpload } from "@/components/CVUpload";
import { StatsBar } from "@/components/StatsBar";
import { JobDetailPanel } from "@/components/JobDetailPanel";
import { JobList } from "@/components/JobList";
import { LiveAnnouncer } from "@/components/LiveAnnouncer";
import { SkipLink } from "@/components/SkipLink";
import { REMOTIVE_DELAY_NOTE } from "@/components/SourceStatusBanner";
import { useThemeMode } from "@/lib/themeContext";
import { useCriteria } from "@/hooks/useCriteria";
import { useJobs } from "@/hooks/useJobs";
import { MAX_QUERY_LENGTH, type JobsResult } from "@/lib/jobsClient";
import { rankJobs } from "@/lib/matching/score";
import type { Job, MatchResult } from "@/lib/types";

export const SEARCH_DEBOUNCE_MS = 300;
export const SKELETON_COUNT = 6;
export const FIRST_VISIT_HINT = "Set your skills to get personalised matches";

const CRITERIA_DRAWER_WIDTH = 300;

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function formatTime(iso: string): string | null {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? null : new Date(time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

type Announcement = { loading: boolean; result: JobsResult | null; shown: number };
function announcement({ loading, result, shown }: Announcement): string {
  if (loading || result === null) return "Loading jobs";
  if (!result.ok) return "Could not load jobs";
  if (result.data.jobs.length === 0) return "No jobs available right now";
  if (shown === 0) return "No jobs match your criteria";
  return `Showing ${plural(shown, "job")}, sorted by match`;
}

// ── Search bar ─────────────────────────────────────────────────────────────────
function SearchBar({
  value,
  onChange,
  onSubmit,
  onRefresh,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onRefresh: () => void;
}) {
  return (
    <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
      <Box
        component="form"
        role="search"
        onSubmit={(e: FormEvent) => { e.preventDefault(); onSubmit(); }}
        sx={{ flex: 1 }}
      >
        <TextField
          type="search"
          placeholder="Job title, skill, or company…"
          size="small"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          slotProps={{
            htmlInput: { maxLength: MAX_QUERY_LENGTH, "data-testid": "search-input", "aria-label": "Search jobs" },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "text.disabled", fontSize: "1.1rem" }} aria-hidden="true" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ width: "100%", "& .MuiOutlinedInput-root": { bgcolor: "background.paper" } }}
        />
      </Box>
      <Button
        variant="contained"
        startIcon={<RefreshIcon aria-hidden="true" />}
        onClick={onRefresh}
        data-testid="refresh-button"
        disableElevation
        sx={{ whiteSpace: "nowrap" }}
      >
        Refresh
      </Button>
    </Stack>
  );
}

// ── Hero banner ─────────────────────────────────────────────────────────────────
function HeroBanner({
  searchInput,
  onSearchChange,
  onSearchSubmit,
  onRefresh,
  jobCount,
  loading,
}: {
  searchInput: string;
  onSearchChange: (v: string) => void;
  onSearchSubmit: () => void;
  onRefresh: () => void;
  jobCount: number;
  loading: boolean;
}) {
  return (
    <Box
      sx={{
        background: "linear-gradient(135deg, #1a56db 0%, #1341a8 40%, #0d2d6e 100%)",
        pt: { xs: 6, md: 9 },
        pb: { xs: 7, md: 10 },
        px: 2,
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.05)",
          top: -180,
          right: -120,
          animation: "blob-drift 10s ease-in-out infinite alternate",
          "@keyframes blob-drift": {
            "0%": { transform: "translate(0,0) scale(1)" },
            "100%": { transform: "translate(-40px,30px) scale(1.1)" },
          },
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        },
        "&::after": {
          content: '""',
          position: "absolute",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.04)",
          bottom: -100,
          left: -80,
          animation: "blob-drift2 12s ease-in-out infinite alternate",
          "@keyframes blob-drift2": {
            "0%": { transform: "translate(0,0) scale(1)" },
            "100%": { transform: "translate(30px,-20px) scale(1.08)" },
          },
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        },
      }}
    >
      <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography
            variant="h2"
            component="h2"
            sx={{
              color: "white",
              fontWeight: 800,
              fontSize: { xs: "2rem", sm: "2.6rem", md: "3rem" },
              lineHeight: 1.15,
              mb: 1.5,
              letterSpacing: "-0.02em",
            }}
          >
            Find Your Dream
            <Box
              component="span"
              sx={{
                display: "block",
                background: "linear-gradient(90deg, #93c5fd, #a5f3fc)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Remote Job Faster
            </Box>
          </Typography>
          <Typography
            variant="h6"
            component="p"
            sx={{ color: "rgba(255,255,255,0.78)", fontWeight: 400, fontSize: { xs: "1rem", md: "1.1rem" }, mb: 4 }}
          >
            Personalised matches from Himalayas &amp; Remotive — ranked by your skills.
          </Typography>

          <Box sx={{ maxWidth: 600, mx: "auto" }}>
            <SearchBar
              value={searchInput}
              onChange={onSearchChange}
              onSubmit={onSearchSubmit}
              onRefresh={onRefresh}
            />
          </Box>
        </Box>

        <Stack direction="row" spacing={{ xs: 2, sm: 4 }} sx={{ justifyContent: "center", flexWrap: "wrap", gap: 2 }}>
          {[
            { value: loading ? "…" : `${jobCount}+`, label: "live listings" },
            { value: "2", label: "curated sources" },
            { value: "0", label: "ads or paywalls" },
          ].map(({ value, label }) => (
            <Box key={label} sx={{ textAlign: "center" }}>
              <Typography sx={{ fontSize: { xs: "1.4rem", md: "1.8rem" }, fontWeight: 800, color: "white", lineHeight: 1 }}>
                {value}
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.65)", fontSize: "0.82rem", mt: 0.25 }}>{label}</Typography>
            </Box>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}

// ── Feature strip ───────────────────────────────────────────────────────────────
function FeatureCards() {
  const features = [
    { icon: <VerifiedIcon sx={{ fontSize: 32, color: "primary.main" }} />, title: "Real listings only", body: "Jobs pulled directly from verified APIs — no scraped boards, no duplicates from the same source." },
    { icon: <TuneIcon sx={{ fontSize: 32, color: "#7c3aed" }} />, title: "Personalised matches", body: "Set your skills, salary floor and benefits once. Every job gets an instant score, ranked just for you." },
    { icon: <SpeedIcon sx={{ fontSize: 32, color: "#0891b2" }} />, title: "Fast & transparent", body: "Scoring runs in your browser — instant re-rank on each change, no extra network calls." },
  ];
  return (
    <Box sx={{ bgcolor: "background.paper", borderBottom: "1px solid", borderColor: "divider" }}>
      <Container maxWidth="md">
        <Grid container>
          {features.map(({ icon, title, body }, i) => (
            <Grid key={title} size={{ xs: 12, sm: 4 }}>
              <Box sx={{ p: { xs: 2.5, sm: 3 }, height: "100%", borderRight: { sm: i < 2 ? "1px solid" : "none" }, borderColor: "divider", transition: "background 0.18s", "&:hover": { bgcolor: "action.hover" } }}>
                <Box sx={{ mb: 1.25 }}>{icon}</Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>{title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>{body}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

// ── Footer ──────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <Box component="footer" sx={{ borderTop: 1, borderColor: "divider", mt: 8, py: 4, bgcolor: "background.paper" }}>
      <Container maxWidth="lg">
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
            <WorkIcon sx={{ color: "primary.main", fontSize: "1.1rem" }} aria-hidden="true" />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>AIventure</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Job data from{" "}
            <Link href="https://himalayas.app" data-testid="footer-himalayas-link">Himalayas</Link>{" "}
            and{" "}
            <Link href="https://remotive.com" data-testid="footer-remotive-link">Remotive</Link>.{" "}
            {REMOTIVE_DELAY_NOTE}
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────────
export function Dashboard() {
  const { mode, toggle: toggleTheme } = useThemeMode();
  const { criteria, setCriteria, isLoaded } = useCriteria();
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const [cvUploadOpen, setCvUploadOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<{ job: Job; match: MatchResult } | null>(null);
  const selectedCardRef = useRef<HTMLElement | null>(null);

  const isDesktop = useMediaQuery("(min-width:900px)");
  const { loading, result, reload } = useJobs(query);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => setQuery(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  const jobs = result?.ok ? result.data.jobs : [];
  const { ranked, excluded } = useMemo(() => rankJobs(jobs, criteria), [jobs, criteria]);

  // Category quick-filter: filter ranked jobs by selected category
  const filteredRanked = useMemo(() => {
    if (!categoryFilter) return ranked;
    return ranked.filter((j) =>
      j.categories.some((c) => c.trim() === categoryFilter)
    );
  }, [ranked, categoryFilter]);

  const liveCount = result?.ok ? result.data.jobs.length : 0;
  const fetchedAt = result?.ok ? formatTime(result.data.fetchedAt) : null;

  const handleSelectJob = useCallback((job: Job) => {
    const jobMatch = ranked.find((r) => r.id === job.id);
    if (jobMatch) {
      setSelectedJob({ job: jobMatch, match: jobMatch.match });
      selectedCardRef.current = document.activeElement as HTMLElement | null;
    }
  }, [ranked]);

  const handleCloseDetail = useCallback(() => {
    setSelectedJob(null);
    setTimeout(() => selectedCardRef.current?.focus(), 50);
  }, []);

  const retryFromCard = () => reload();

  const msg = announcement({ loading, result, shown: filteredRanked.length });

  return (
    <>
      <SkipLink />

      {/* App bar */}
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ gap: 1.5, minHeight: { xs: 56, sm: 64 } }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", flexGrow: 1 }}>
            <WorkIcon sx={{ color: "primary.main", fontSize: "1.3rem" }} aria-hidden="true" />
            <Typography variant="h6" component="h1" sx={{ fontWeight: 800, fontSize: "1rem", letterSpacing: "-0.01em" }}>
              AIventure{" "}
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" }, fontWeight: 400, opacity: 0.65, fontSize: "0.9rem" }}>
                – Job matches
              </Box>
            </Typography>
          </Stack>
          {!isDesktop && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<TuneIcon fontSize="small" />}
              onClick={() => setCriteriaOpen(true)}
              data-testid="criteria-open-button"
              sx={{ borderColor: "divider", color: "text.secondary" }}
            >
              Criteria
            </Button>
          )}
          <Button
            size="small"
            variant="contained"
            startIcon={<DescriptionIcon fontSize="small" aria-hidden="true" />}
            onClick={() => setCvUploadOpen(true)}
            data-testid="cv-upload-open-button"
            disableElevation
            sx={{ bgcolor: "primary.main", whiteSpace: "nowrap", display: { xs: "none", sm: "flex" } }}
          >
            Upload CV
          </Button>
          <Tooltip title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            <IconButton
              onClick={toggleTheme}
              aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              data-testid="theme-toggle-button"
              size="small"
              sx={{ color: "text.secondary" }}
            >
              {mode === "dark" ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Hero */}
      <HeroBanner
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={() => setQuery(searchInput.trim())}
        onRefresh={reload}
        jobCount={liveCount}
        loading={loading}
      />

      {/* Feature strip */}
      <FeatureCards />

      {/* Main layout: aside + main */}
      <Box sx={{ bgcolor: "background.default", minHeight: "50vh" }}>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>

            {/* Desktop criteria sidebar */}
            {isDesktop && (
              <Box
                component="aside"
                aria-label="Job criteria"
                sx={{
                  width: CRITERIA_DRAWER_WIDTH,
                  flexShrink: 0,
                  position: "sticky",
                  top: 80,
                  maxHeight: "calc(100vh - 100px)",
                  overflowY: "auto",
                  bgcolor: "background.paper",
                  borderRadius: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  p: 2.5,
                  "&::-webkit-scrollbar": { width: 6 },
                  "&::-webkit-scrollbar-track": { background: "transparent" },
                  "&::-webkit-scrollbar-thumb": { background: "grey.300", borderRadius: 3 },
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: "text.primary" }}>
                  Your criteria
                </Typography>
                {/* CV Upload CTA */}
                <Box
                  sx={{
                    mb: 2,
                    p: 1.5,
                    borderRadius: 2,
                    background: "linear-gradient(135deg, rgba(26,86,219,0.08) 0%, rgba(13,45,110,0.04) 100%)",
                    border: "1px solid",
                    borderColor: "primary.100",
                    cursor: "pointer",
                    transition: "all 0.18s",
                    "&:hover": { borderColor: "primary.main", bgcolor: "rgba(26,86,219,0.08)" },
                  }}
                  role="button"
                  tabIndex={0}
                  onClick={() => setCvUploadOpen(true)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setCvUploadOpen(true); }}
                  data-testid="cv-upload-sidebar-cta"
                  aria-label="Upload CV to auto-fill criteria"
                >
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1.5,
                        background: "linear-gradient(135deg, #1a56db 0%, #0d2d6e 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <DescriptionIcon sx={{ fontSize: 16, color: "white" }} aria-hidden="true" />
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.dark", display: "block", lineHeight: 1.3 }}>
                        Upload your CV
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.68rem" }}>
                        Auto-fill skills &amp; titles
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
                <CriteriaForm criteria={criteria} onChange={setCriteria} />
              </Box>
            )}

            {/* Results column */}
            <Box component="main" id="main" tabIndex={-1} sx={{ flex: 1, minWidth: 0 }}>
              {/* Results header */}
              <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
                <Box>
                  <Typography variant="h5" component="h2" id="results-heading" aria-label="Results" sx={{ fontWeight: 800 }}>
                    {loading ? "Loading jobs…" : `${plural(ranked.length, "job")} found`}
                  </Typography>
                  {!loading && result?.ok && (
                    <Typography variant="body2" color="text.secondary" data-testid="results-summary">
                      {excluded.length > 0 && `${excluded.length} excluded · `}
                      {fetchedAt && `updated ${fetchedAt}`}
                    </Typography>
                  )}
                </Box>
              </Stack>

              {/* First-visit hint */}
              {isLoaded && criteria.keywords.length === 0 && (
                <Alert severity="info" role="note" data-testid="first-visit-hint" sx={{ borderRadius: 2, mb: 2 }}>
                  {FIRST_VISIT_HINT}. Until then, every job shows a 100% match.
                </Alert>
              )}

              {/* Stats bar */}
              <StatsBar jobs={ranked} loading={loading} />

              {/* Category quick-filter */}
              {!loading && ranked.length > 0 && (
                <CategoryFilter
                  jobs={ranked}
                  selected={categoryFilter}
                  onChange={setCategoryFilter}
                />
              )}

              {/* Empty API state */}
              {result?.ok && result.data.jobs.length === 0 && (
                <Box
                  sx={{ textAlign: "center", py: 6, borderRadius: 3, border: "1px dashed", borderColor: "divider", mb: 2 }}
                  data-testid="empty-api-state"
                >
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>No jobs available right now</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Neither source returned listings for this search.</Typography>
                  <Button variant="contained" onClick={retryFromCard} data-testid="empty-api-retry-button" disableElevation>Retry</Button>
                </Box>
              )}

              <Box
                aria-busy={loading}
                aria-labelledby="results-heading"
                component="section"
                data-testid="results"
              >
                <JobList
                  ranked={filteredRanked}
                  excluded={excluded}
                  loading={loading}
                  result={result}
                  criteria={criteria}
                  onRetry={retryFromCard}
                  onSelect={handleSelectJob}
                  skeletonCount={SKELETON_COUNT}
                />
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      <Footer />

      {/* Mobile criteria drawer */}
      <Drawer
        anchor="left"
        open={!isDesktop && criteriaOpen}
        onClose={() => setCriteriaOpen(false)}
        data-testid="criteria-drawer"
        slotProps={{ paper: { sx: { width: "min(340px, 90vw)", p: 2.5 } } }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Your criteria</Typography>
          <IconButton size="small" onClick={() => setCriteriaOpen(false)} aria-label="Close criteria panel">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <CriteriaForm criteria={criteria} onChange={(next) => { setCriteria(next); }} />
      </Drawer>

      {/* CV Upload dialog */}
      <CVUpload
        open={cvUploadOpen}
        onClose={() => setCvUploadOpen(false)}
        onApply={(patch) => setCriteria((prev) => ({ ...prev, ...patch }))}
      />

      {/* Job detail panel */}
      {selectedJob && (
        <JobDetailPanel
          job={selectedJob.job}
          match={selectedJob.match}
          mustHave={criteria.mustHaveBenefits}
          onClose={handleCloseDetail}
        />
      )}

      <LiveAnnouncer message={msg} />

      {/* AI chat assistant */}
      <ChatWidget job={selectedJob?.job ?? null} />
    </>
  );
}

export default Dashboard;
