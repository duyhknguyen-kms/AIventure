"use client";

import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CodeIcon from "@mui/icons-material/Code";
import WorkIcon from "@mui/icons-material/Work";
import type { Job } from "@/lib/types";
import { formatCompactAmount } from "@/lib/format";

export interface StatsBarProps {
  jobs: readonly Job[];
  loading?: boolean;
}

function topSkills(jobs: readonly Job[], limit = 5): string[] {
  const freq = new Map<string, number>();
  for (const job of jobs) {
    for (const cat of [...job.categories, ...job.tags]) {
      const key = cat.trim().toLowerCase();
      if (key) freq.set(key, (freq.get(key) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));
}

function salaryStats(jobs: readonly Job[]): { min: number; max: number; currency: string } | null {
  const annuals = jobs
    .filter((j) => j.salary?.annualMin != null || j.salary?.annualMax != null)
    .flatMap((j) => [j.salary!.annualMin, j.salary!.annualMax].filter((v): v is number => v != null));
  if (annuals.length === 0) return null;
  const currency = jobs.find((j) => j.salary?.currency)?.salary?.currency ?? "USD";
  return { min: Math.min(...annuals), max: Math.max(...annuals), currency };
}

function Stat({
  icon,
  label,
  value,
  tip,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tip?: string;
}) {
  const content = (
    <Stack direction="row" spacing={0.6} sx={{ alignItems: "center" }}>
      <Box sx={{ color: "text.disabled", display: "flex", alignItems: "center" }}>{icon}</Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
        {label}
      </Typography>
      <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary" }}>
        {value}
      </Typography>
    </Stack>
  );

  return tip ? <Tooltip title={tip} placement="top">{content}</Tooltip> : content;
}

/**
 * A compact stats row above the job list showing total jobs, salary range
 * and top categories. All computed client-side from the ranked jobs array.
 */
export function StatsBar({ jobs, loading }: StatsBarProps) {
  if (loading) {
    return (
      <Box sx={{ mb: 2, display: "flex", gap: 3 }}>
        {[80, 120, 160].map((w) => (
          <Skeleton key={w} variant="text" width={w} height={18} />
        ))}
      </Box>
    );
  }

  if (jobs.length === 0) return null;

  const salary = salaryStats(jobs);
  const skills = topSkills(jobs);

  return (
    <Box
      sx={{
        mb: 2.5,
        px: 2,
        py: 1.25,
        borderRadius: 2,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        display: "flex",
        flexWrap: "wrap",
        gap: { xs: 1.5, sm: 3 },
        alignItems: "center",
      }}
      data-testid="stats-bar"
    >
      <Stat
        icon={<WorkIcon sx={{ fontSize: 13 }} />}
        label="Jobs:"
        value={String(jobs.length)}
        tip="Total matching jobs"
      />
      {salary && (
        <Stat
          icon={<AttachMoneyIcon sx={{ fontSize: 13 }} />}
          label="Salary range:"
          value={`${salary.currency} ${formatCompactAmount(salary.min)}–${formatCompactAmount(salary.max)}/yr`}
          tip="Annual salary range across jobs with known salary"
        />
      )}
      {skills.length > 0 && (
        <Stat
          icon={<CodeIcon sx={{ fontSize: 13 }} />}
          label="Top skills:"
          value={skills.join(", ")}
          tip="Most common categories in current results"
        />
      )}
    </Box>
  );
}

export default StatsBar;
