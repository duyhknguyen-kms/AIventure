"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Drawer from "@mui/material/Drawer";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import TuneIcon from "@mui/icons-material/Tune";
import CriteriaForm from "@/components/CriteriaForm";
import JobDetailPanel from "@/components/JobDetailPanel";
import LiveAnnouncer from "@/components/LiveAnnouncer";
import SkipLink from "@/components/SkipLink";
import SourceStatusBanner from "@/components/SourceStatusBanner";
import JobList from "@/components/JobList";
import { useCriteria } from "@/hooks/useCriteria";
import { rankJobs } from "@/lib/matching/score";
import type { Job, SourceStatus, MatchResult } from "@/lib/types";

interface ApiResponse {
  jobs: Job[];
  sources: SourceStatus[];
  fetchedAt: string;
}

type RankedJob = Job & { match: MatchResult };

export default function HomePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [criteria, setCriteria] = useCriteria();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<(RankedJob) | null>(null);

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [sources, setSources] = useState<SourceStatus[]>([]);
  const [rawJobs, setRawJobs] = useState<Job[]>([]);
  const [announcement, setAnnouncement] = useState("Loading jobs");

  // ── Fetch ─────────────────────────────────────────────────────────────
  const loadJobs = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    setAnnouncement("Loading jobs");
    try {
      const res = await fetch("/api/jobs");
      if (res.status === 502) {
        const body = await res.json();
        setSources(body.sources ?? []);
        setFetchError("All sources unavailable");
        setRawJobs([]);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ApiResponse = await res.json();
      setSources(data.sources);
      setRawJobs(data.jobs);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  // ── Re-rank on criteria or jobs change (pure, no network) ─────────────
  const { ranked, excluded } = useMemo(
    () => (rawJobs.length ? rankJobs(rawJobs, criteria) : { ranked: [], excluded: [] }),
    [rawJobs, criteria],
  );

  useEffect(() => {
    if (!loading && rawJobs.length > 0) {
      setAnnouncement(`Showing ${ranked.length} job${ranked.length !== 1 ? "s" : ""}, sorted by match`);
    }
  }, [ranked.length, loading, rawJobs.length]);

  // ── Criteria sidebar / drawer ─────────────────────────────────────────
  const criteriaPanel = (
    <Box sx={{ p: isMobile ? 2 : 0 }}>
      <CriteriaForm criteria={criteria} onChange={setCriteria} />
    </Box>
  );

  return (
    <>
      <SkipLink />
      <LiveAnnouncer message={announcement} />

      {/* ── Header ───────────────────────────────────────────────────── */}
      <AppBar component="header" position="sticky" elevation={1}>
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open criteria"
              sx={{ mr: 1 }}
            >
              <TuneIcon />
            </IconButton>
          )}
          <Typography variant="h6" component="span" sx={{ flexGrow: 1 }}>
            AIventure
          </Typography>
          <Button color="inherit" onClick={loadJobs} aria-label="Refresh job listings">
            Refresh
          </Button>
        </Toolbar>
      </AppBar>

      {/* Mobile criteria drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{ paper: { sx: { width: 320, overflowY: "auto" } } }}
        aria-label="Criteria"
      >
        {criteriaPanel}
      </Drawer>

      {/* ── Status banner ─────────────────────────────────────────────── */}
      {sources.some((s) => !s.ok) && (
        <Container maxWidth="lg" sx={{ mt: 2 }}>
          <SourceStatusBanner sources={sources} onRetry={loadJobs} />
        </Container>
      )}

      {/* ── Main content ──────────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ py: 4 }} component="main" id="main">
        <Typography variant="h4" component="h1" gutterBottom>
          AIventure – Job matches
        </Typography>

        {fetchError && !loading ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography color="error" gutterBottom>{fetchError}</Typography>
            <Button variant="outlined" onClick={loadJobs}>Retry</Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Desktop criteria sidebar */}
            {!isMobile && (
              <Grid
                component="aside"
                aria-label="Job criteria"
                size={{ md: 3 }}
                sx={{ display: { xs: "none", md: "block" } }}
              >
                {criteriaPanel}
              </Grid>
            )}

            {/* Results column */}
            <Grid size={{ xs: 12, md: 9 }}>
              <Typography variant="h5" component="h2" gutterBottom>
                Results
              </Typography>
              <JobList
                ranked={ranked as RankedJob[]}
                excluded={excluded}
                mustHave={criteria.mustHaveBenefits}
                keywords={criteria.keywords}
                targetTitles={criteria.targetTitles}
                loading={loading}
                onJobClick={(job) => setSelectedJob(ranked.find((r) => r.id === job.id) ?? null)}
                onAnnounce={setAnnouncement}
              />
            </Grid>
          </Grid>
        )}
      </Container>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      {/* Job detail panel */}
      <JobDetailPanel
        job={selectedJob}
        match={selectedJob?.match ?? null}
        mustHave={criteria.mustHaveBenefits}
        keywords={criteria.keywords}
        targetTitles={criteria.targetTitles}
        excludedKeywords={criteria.excludedKeywords}
        open={selectedJob !== null}
        onClose={() => setSelectedJob(null)}
      />

      <Box component="footer" sx={{ mt: 4, py: 2, borderTop: "1px solid", borderColor: "divider" }}>
        <Container maxWidth="lg">
          <Typography variant="caption" color="text.secondary">
            Job data from{" "}
            <a href="https://himalayas.app" target="_blank" rel="noopener noreferrer">Himalayas</a>
            {" "}and{" "}
            <a href="https://remotive.com" target="_blank" rel="noopener noreferrer">Remotive</a>
            . Apply links go directly to official source pages.
          </Typography>
        </Container>
      </Box>
    </>
  );
}
