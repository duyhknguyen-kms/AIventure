"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import type { Job } from "@/lib/types";

export interface CategoryFilterProps {
  jobs: readonly Job[];
  selected: string | null;
  onChange: (category: string | null) => void;
}

const TOP_N = 8;

function topCategories(jobs: readonly Job[]): { label: string; count: number }[] {
  const freq = new Map<string, number>();
  for (const job of jobs) {
    for (const cat of job.categories) {
      const key = cat.trim();
      if (key) freq.set(key, (freq.get(key) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N)
    .map(([label, count]) => ({ label, count }));
}

/**
 * Quick-filter chips derived from the current job categories.
 * Clicking a chip filters jobs to that category; clicking again clears it.
 */
export function CategoryFilter({ jobs, selected, onChange }: CategoryFilterProps) {
  const categories = topCategories(jobs);
  if (categories.length === 0) return null;

  return (
    <Box sx={{ mb: 2 }} data-testid="category-filter">
      <Typography
        variant="caption"
        sx={{ fontWeight: 700, color: "text.secondary", letterSpacing: "0.06em", mr: 1 }}
      >
        BROWSE:
      </Typography>
      <Box sx={{ display: "inline-flex", flexWrap: "wrap", gap: 0.75 }}>
        {categories.map(({ label, count }) => {
          const active = selected === label;
          return (
            <Chip
              key={label}
              label={`${label} (${count})`}
              size="small"
              variant={active ? "filled" : "outlined"}
              color={active ? "primary" : "default"}
              onClick={() => onChange(active ? null : label)}
              aria-pressed={active}
              data-testid={`category-chip-${label.toLowerCase().replace(/\s+/g, "-")}`}
              sx={{
                borderRadius: 2,
                fontWeight: active ? 700 : 500,
                fontSize: "0.75rem",
                cursor: "pointer",
                transition: "all 0.15s",
                borderColor: active ? "primary.main" : "divider",
                "&:hover": { borderColor: "primary.main", color: "primary.main" },
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
}

export default CategoryFilter;
