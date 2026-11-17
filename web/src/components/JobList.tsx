"use client";
import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Pagination from "@mui/material/Pagination";
import Select from "@mui/material/Select";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import JobCard from "./JobCard";
import type { Job, MatchResult, BenefitKey } from "@/lib/types";

const PAGE_SIZE = 10;

type SortKey = "match" | "newest" | "salary";

interface RankedJob extends Job { match: MatchResult }
interface ExcludedJob { job: Job; reason: string }

interface Props {
  ranked: RankedJob[];
  excluded: ExcludedJob[];
  mustHave?: BenefitKey[];
  keywords?: string[];
  targetTitles?: string[];
  loading?: boolean;
  onJobClick: (job: Job) => void;
  /** Polite announcement callback (connected to LiveAnnouncer in page.tsx) */
  onAnnounce?: (msg: string) => void;
}

function sortJobs(jobs: RankedJob[], key: SortKey): RankedJob[] {
  const copy = [...jobs];
  if (key === "match") return copy;
  if (key === "newest") return copy.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  if (key === "salary") {
    return copy.sort((a, b) => {
      const aMax = a.salary?.annualMax ?? -1;
      const bMax = b.salary?.annualMax ?? -1;
      return bMax - aMax;
    });
  }
  return copy;
}

export default function JobList({
  ranked,
  excluded,
  mustHave = [],
  keywords = [],
  targetTitles = [],
  loading = false,
  onJobClick,
  onAnnounce,
}: Props) {
  const [sort, setSort] = useState<SortKey>("match");
  const [page, setPage] = useState(1);
  const [showExcluded, setShowExcluded] = useState(false);

  const sorted = useMemo(() => sortJobs(ranked, sort), [ranked, sort]);

  // Reset to page 1 whenever the sorted list changes (new criteria, sort, or refresh)
  useEffect(() => {
    setPage(1);
  }, [sorted]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageStart = (page - 1) * PAGE_SIZE;
  const paginated = sorted.slice(pageStart, pageStart + PAGE_SIZE);

  function handlePageChange(_: React.ChangeEvent<unknown>, value: number) {
    setPage(value);
    // Scroll to results top so keyboard users don't get lost
    document.getElementById("main")?.scrollIntoView({ behavior: "smooth", block: "start" });
    const start = (value - 1) * PAGE_SIZE + 1;
    const end = Math.min(value * PAGE_SIZE, sorted.length);
    onAnnounce?.(`Page ${value} of ${totalPages}, showing jobs ${start}–${end}`);
  }

  if (loading) {
    return (
      <Stack
        component="ul"
        spacing={2}
        sx={{ p: 0, m: 0 }}
        aria-busy="true"
        aria-label="Loading jobs"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Box component="li" key={i} sx={{ listStyle: "none" }}>
            <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />
          </Box>
        ))}
      </Stack>
    );
  }

  if (sorted.length === 0 && excluded.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
        No jobs available right now.
      </Typography>
    );
  }

  if (sorted.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <Typography color="text.secondary" gutterBottom>
          No jobs match your criteria.
        </Typography>
        <Button onClick={() => setShowExcluded(true)}>
          Show excluded ({excluded.length})
        </Button>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {/* Controls */}
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <Typography variant="body2" color="text.secondary">
          {sorted.length} job{sorted.length !== 1 ? "s" : ""}
          {excluded.length > 0 ? ` (${excluded.length} excluded)` : ""}
        </Typography>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="sort-label">Sort</InputLabel>
          <Select
            labelId="sort-label"
            id="sort-select"
            value={sort}
            label="Sort"
            onChange={(e) => {
              setSort(e.target.value as SortKey);
              setPage(1);
            }}
          >
            <MenuItem value="match">Match %</MenuItem>
            <MenuItem value="newest">Newest</MenuItem>
            <MenuItem value="salary">Salary (high–low)</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {/* Results list (current page only) */}
      <Stack component="ul" spacing={2} sx={{ p: 0, m: 0 }}>
        {paginated.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            match={job.match}
            mustHave={mustHave}
            keywords={keywords}
            targetTitles={targetTitles}
            onClick={onJobClick}
          />
        ))}
      </Stack>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", pt: 1 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            showFirstButton
            showLastButton
            aria-label="Job results pages"
          />
        </Box>
      )}

      {/* Excluded toggle */}
      {excluded.length > 0 && (
        <Box>
          <Button
            variant="text"
            size="small"
            onClick={() => setShowExcluded((v) => !v)}
          >
            {showExcluded ? "Hide excluded" : `Show excluded (${excluded.length})`}
          </Button>
          {showExcluded && (
            <Stack component="ul" spacing={1} sx={{ mt: 1, p: 0 }}>
              {excluded.map(({ job, reason }) => (
                <Typography
                  key={job.id}
                  component="li"
                  variant="caption"
                  color="text.secondary"
                  sx={{ listStyle: "none" }}
                >
                  {job.title} @ {job.company} — {reason}
                </Typography>
              ))}
            </Stack>
          )}
        </Box>
      )}
    </Stack>
  );
}
