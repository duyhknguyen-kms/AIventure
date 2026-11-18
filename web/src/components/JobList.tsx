"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import MenuItem from "@mui/material/MenuItem";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FilterListIcon from "@mui/icons-material/FilterList";
import { JobCard } from "@/components/JobCard";
import { SourceStatusBanner } from "@/components/SourceStatusBanner";
import { isSortKey, SORT_OPTIONS, sortRankedJobs, type SortKey } from "@/lib/matching/sort";
import type { Job, MatchResult } from "@/lib/types";
import type { Criteria } from "@/lib/matching/criteria";
import type { JobsResult } from "@/lib/jobsClient";

type SourceName = "himalayas" | "remotive" | "both";

export interface JobListProps {
  ranked: (Job & { match: MatchResult })[];
  excluded: { job: Job; reason: string }[];
  loading: boolean;
  result: JobsResult | null;
  criteria: Criteria;
  onRetry: () => void;
  onSelect?: (job: Job) => void;
  skeletonCount?: number;
}

/**
 * Animated placeholder cards while loading.
 */
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Skeleton from "@mui/material/Skeleton";
import useMediaQuery from "@mui/material/useMediaQuery";

function SkeletonCards({ count, animate }: { count: number; animate: boolean }) {
  const animation = animate ? "wave" : false;
  return (
    <Stack spacing={2} aria-hidden="true" data-testid="job-skeletons">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} variant="outlined" sx={{ borderRadius: 3, border: "1px solid", borderColor: "grey.200" }}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1.5 }}>
              <Skeleton variant="circular" width={48} height={48} animation={animation} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="55%" height={22} animation={animation} />
                <Skeleton variant="text" width="30%" height={18} animation={animation} />
              </Box>
              <Skeleton variant="rounded" width={80} height={28} animation={animation} sx={{ borderRadius: 2 }} />
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
              <Skeleton variant="rounded" width={90} height={26} animation={animation} sx={{ borderRadius: 2 }} />
              <Skeleton variant="rounded" width={110} height={26} animation={animation} sx={{ borderRadius: 2 }} />
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

/**
 * Job list with filter / sort controls (SPEC §10.3, FR6, FR7).
 */
export function JobList({
  ranked,
  excluded,
  loading,
  result,
  criteria,
  onRetry,
  onSelect,
  skeletonCount = 6,
}: JobListProps) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [sort, setSort] = useState<SortKey>("match");
  const [minMatch, setMinMatch] = useState(0);
  const [sourceFilter, setSourceFilter] = useState<SourceName>("both");
  const [salaryOnly, setSalaryOnly] = useState(false);
  const [showExcluded, setShowExcluded] = useState(false);

  const filtered = useMemo(() => {
    let jobs = ranked;
    if (minMatch > 0) jobs = jobs.filter((j) => j.match.matchPercent >= minMatch);
    if (sourceFilter !== "both") jobs = jobs.filter((j) => j.source === sourceFilter);
    if (salaryOnly) jobs = jobs.filter((j) => j.salary !== null);
    return sortRankedJobs(jobs, sort);
  }, [ranked, sort, minMatch, sourceFilter, salaryOnly]);

  const isFailure = result !== null && !result.ok;

  return (
    <Box>
      {/* Filter bar */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1.5,
          alignItems: "center",
          mb: 2,
          p: 1.5,
          borderRadius: 2,
          bgcolor: "white",
          border: "1px solid",
          borderColor: "grey.200",
        }}
      >
        <FilterListIcon sx={{ color: "text.disabled", fontSize: "1rem" }} aria-hidden="true" />

        {/* Sort */}
        <TextField
          select
          size="small"
          label="Sort"
          value={sort}
          onChange={(e) => { if (isSortKey(e.target.value)) setSort(e.target.value); }}
          slotProps={{ htmlInput: { "data-testid": "sort-select", "aria-label": "Sort jobs by" } }}
          sx={{ minWidth: 130, "& .MuiOutlinedInput-root": { bgcolor: "white" } }}
        >
          {SORT_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
          ))}
        </TextField>

        {/* Min match slider */}
        <Box sx={{ flex: "1 1 180px", minWidth: 160 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.25 }}>
            Min match: {minMatch}%
          </Typography>
          <Slider
            value={minMatch}
            min={0}
            max={100}
            step={5}
            onChange={(_, v) => setMinMatch(v as number)}
            aria-label="Minimum match percentage"
            valueLabelDisplay="auto"
            size="small"
            data-testid="jl-min-match"
            sx={{ color: "primary.main", py: 0.5 }}
          />
        </Box>

        {/* Source toggles */}
        <ToggleButtonGroup
          exclusive
          size="small"
          value={sourceFilter}
          onChange={(_, v: SourceName | null) => { if (v) setSourceFilter(v); }}
          aria-label="Filter by source"
          data-testid="jl-source-filter"
        >
          <ToggleButton value="both" aria-label="Both sources" sx={{ px: 1.5, fontSize: "0.78rem" }}>
            Both
          </ToggleButton>
          <ToggleButton value="himalayas" aria-label="Himalayas only" sx={{ px: 1.5, fontSize: "0.78rem" }}>
            Himalayas
          </ToggleButton>
          <ToggleButton value="remotive" aria-label="Remotive only" sx={{ px: 1.5, fontSize: "0.78rem" }}>
            Remotive
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Salary only switch */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Switch
            id="jl-salary-switch"
            size="small"
            checked={salaryOnly}
            onChange={(e) => setSalaryOnly(e.target.checked)}
            slotProps={{ input: { "aria-label": "Show only jobs with known salary" } as never }}
            data-testid="jl-salary-only"
          />
          <Typography
            component="label"
            htmlFor="jl-salary-switch"
            variant="caption"
            sx={{ cursor: "pointer", userSelect: "none", color: "text.secondary" }}
          >
            Salary listed
          </Typography>
        </Box>
      </Box>

      {/* Source status banner */}
      {result?.ok && <SourceStatusBanner sources={result.data.sources} onRetry={onRetry} />}
      {isFailure && (
        <SourceStatusBanner variant="total" sources={result.sources} error={result.error} onRetry={onRetry} />
      )}

      {/* Job list area */}
      <Box aria-busy={loading} data-testid="job-list-area">
        {loading ? (
          <SkeletonCards count={skeletonCount} animate={!reducedMotion} />
        ) : filtered.length > 0 ? (
          <Stack
            component="ul"
            spacing={2}
            data-testid="job-list"
            sx={{ listStyle: "none", m: 0, p: 0 }}
          >
            {filtered.map((job) => (
              <Box
                component="li"
                key={job.id}
                sx={{
                  animation: "fade-slide-up 0.25s ease both",
                  "@keyframes fade-slide-up": {
                    from: { opacity: 0, transform: "translateY(10px)" },
                    to: { opacity: 1, transform: "translateY(0)" },
                  },
                  "@media (prefers-reduced-motion: reduce)": { animation: "none" },
                }}
              >
                <JobCard
                  job={job}
                  match={job.match}
                  mustHave={criteria.mustHaveBenefits}
                  onSelect={onSelect}
                />
              </Box>
            ))}
          </Stack>
        ) : (
          <Box
            sx={{
              textAlign: "center",
              py: 6,
              borderRadius: 3,
              border: "1px dashed",
              borderColor: "grey.300",
            }}
            data-testid="jl-empty"
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              No jobs match your filters
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try lowering the minimum match or changing your source filter.
            </Typography>
          </Box>
        )}
      </Box>

      {/* Show excluded */}
      {excluded.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Button
            size="small"
            endIcon={
              <ExpandMoreIcon
                aria-hidden="true"
                sx={{ transform: showExcluded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
              />
            }
            onClick={() => setShowExcluded((v) => !v)}
            aria-expanded={showExcluded}
            data-testid="jl-excluded-toggle"
            sx={{ color: "text.secondary", textTransform: "none" }}
          >
            {showExcluded ? "Hide excluded" : `Show excluded (${excluded.length})`}
          </Button>
          <Collapse in={showExcluded}>
            <Stack
              component="ul"
              spacing={1}
              sx={{ listStyle: "none", m: 0, p: 0, mt: 1 }}
              data-testid="jl-excluded-list"
            >
              {excluded.map(({ job, reason }) => (
                <Box
                  component="li"
                  key={job.id}
                  sx={{
                    display: "flex",
                    gap: 1.5,
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: "grey.50",
                    border: "1px solid",
                    borderColor: "grey.200",
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {job.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {job.company} · {reason}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Collapse>
        </Box>
      )}
    </Box>
  );
}

export default JobList;
