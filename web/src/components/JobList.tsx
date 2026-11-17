"use client";
import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import JobCard from "./JobCard";
import type { Job, MatchResult, BenefitKey } from "@/lib/types";

type SortKey = "match" | "newest" | "salary";

interface RankedJob extends Job { match: MatchResult }
interface ExcludedJob { job: Job; reason: string }

interface Props {
  ranked: RankedJob[];
  excluded: ExcludedJob[];
  mustHave?: BenefitKey[];
  loading?: boolean;
  onJobClick: (job: Job) => void;
}

function sortJobs(jobs: RankedJob[], key: SortKey): RankedJob[] {
  const copy = [...jobs];
  if (key === "match") return copy; // already sorted by match desc
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

export default function JobList({ ranked, excluded, mustHave = [], loading = false, onJobClick }: Props) {
  const [sort, setSort] = useState<SortKey>("match");
  const [showExcluded, setShowExcluded] = useState(false);

  const sorted = useMemo(() => sortJobs(ranked, sort), [ranked, sort]);

  if (loading) {
    return (
      <Stack component="ul" spacing={2} sx={{ p: 0, m: 0 }} aria-busy="true" aria-label="Loading jobs">
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
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <MenuItem value="match">Match %</MenuItem>
            <MenuItem value="newest">Newest</MenuItem>
            <MenuItem value="salary">Salary (high–low)</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {/* Results list */}
      <Stack component="ul" spacing={2} sx={{ p: 0, m: 0 }}>
        {sorted.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            match={job.match}
            mustHave={mustHave}
            onClick={onJobClick}
          />
        ))}
      </Stack>

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
