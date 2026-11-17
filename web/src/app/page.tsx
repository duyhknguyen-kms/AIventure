"use client";
import { useCallback, useEffect, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import LiveAnnouncer from "@/components/LiveAnnouncer";
import SkipLink from "@/components/SkipLink";
import SourceStatusBanner from "@/components/SourceStatusBanner";
import JobList from "@/components/JobList";
import { DEFAULT_CRITERIA } from "@/lib/matching/criteria";
import { rankJobs } from "@/lib/matching/score";
import type { Job, SourceStatus, MatchResult } from "@/lib/types";

interface ApiResponse {
  jobs: Job[];
  sources: SourceStatus[];
  fetchedAt: string;
}

type RankedJob = Job & { match: MatchResult };

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<SourceStatus[]>([]);
  const [ranked, setRanked] = useState<RankedJob[]>([]);
  const [excluded, setExcluded] = useState<{ job: Job; reason: string }[]>([]);
  const [announcement, setAnnouncement] = useState("Loading jobs");

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAnnouncement("Loading jobs");
    try {
      const res = await fetch("/api/jobs");
      if (res.status === 502) {
        const body = await res.json();
        setSources(body.sources ?? []);
        setError("All sources unavailable");
        setRanked([]);
        setExcluded([]);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ApiResponse = await res.json();
      setSources(data.sources);

      const { ranked: r, excluded: ex } = rankJobs(data.jobs, DEFAULT_CRITERIA);
      setRanked(r);
      setExcluded(ex);
      setAnnouncement(
        `Showing ${r.length} job${r.length !== 1 ? "s" : ""}, sorted by match`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  return (
    <>
      <SkipLink />
      <LiveAnnouncer message={announcement} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <AppBar component="header" position="sticky" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="span" sx={{ flexGrow: 1 }}>
            AIventure
          </Typography>
          <Button
            color="inherit"
            onClick={loadJobs}
            aria-label="Refresh job listings"
          >
            Refresh
          </Button>
        </Toolbar>
      </AppBar>

      {/* ── Status banner ───────────────────────────────────────────────── */}
      {sources.some((s) => !s.ok) && (
        <Container maxWidth="lg" sx={{ mt: 2 }}>
          <SourceStatusBanner sources={sources} onRetry={loadJobs} />
        </Container>
      )}

      {/* ── Main content ────────────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ py: 4 }} component="main" id="main">
        <Typography variant="h4" component="h1" gutterBottom>
          AIventure – Job matches
        </Typography>

        {error && !loading ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography color="error" gutterBottom>
              {error}
            </Typography>
            <Button variant="outlined" onClick={loadJobs}>
              Retry
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Criteria sidebar — placeholder until Stage 7 */}
            <Grid
              component="aside"
              aria-label="Job criteria"
              size={{ xs: 12, md: 3 }}
            >
              <Box
                sx={{
                  p: 2,
                  border: "1px dashed",
                  borderColor: "divider",
                  borderRadius: 1,
                  color: "text.secondary",
                  fontSize: "0.875rem",
                }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  Criteria (coming in Stage 7)
                </Typography>
                <Typography variant="caption">
                  Set your skills, seniority, salary and benefits to get
                  personalised match scores.
                </Typography>
              </Box>
            </Grid>

            {/* Results column */}
            <Grid size={{ xs: 12, md: 9 }}>
              <Typography variant="h5" component="h2" gutterBottom>
                Results
              </Typography>
              <JobList
                ranked={ranked}
                excluded={excluded}
                loading={loading}
                onJobClick={() => {
                  /* Stage 8 — detail panel */
                }}
              />
            </Grid>
          </Grid>
        )}
      </Container>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <Box component="footer" sx={{ mt: 4, py: 2, borderTop: "1px solid", borderColor: "divider" }}>
        <Container maxWidth="lg">
          <Typography variant="caption" color="text.secondary">
            Job data from{" "}
            <a href="https://himalayas.app" target="_blank" rel="noopener noreferrer">
              Himalayas
            </a>{" "}
            and{" "}
            <a href="https://remotive.com" target="_blank" rel="noopener noreferrer">
              Remotive
            </a>
            . Apply links go directly to official source pages.
          </Typography>
        </Container>
      </Box>
    </>
  );
}
