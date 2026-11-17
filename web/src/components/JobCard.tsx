"use client";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import BenefitChips from "./BenefitChips";
import HighlightText from "./HighlightText";
import SourceAttribution from "./SourceAttribution";
import type { Job, MatchResult, BenefitKey } from "@/lib/types";

interface Props {
  job: Job;
  match: MatchResult;
  mustHave?: BenefitKey[];
  keywords?: string[];
  targetTitles?: string[];
  onClick: (job: Job) => void;
}

/** §10.5 — Match level: number + text, never colour alone. */
function matchLevel(pct: number): { label: string; color: "success" | "warning" | "error" } {
  if (pct >= 75) return { label: "Strong match", color: "success" };
  if (pct >= 50) return { label: "Medium match", color: "warning" };
  return { label: "Low match", color: "error" };
}

/** Format salary for display, e.g. "USD 120k–150k/yr" */
function formatSalary(job: Job): string | null {
  const s = job.salary;
  if (!s) return null;
  const cur = s.currency ?? "";
  const fmt = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
  const range =
    s.min !== null && s.max !== null && s.min !== s.max
      ? `${fmt(s.min)}–${fmt(s.max)}`
      : s.max !== null
      ? fmt(s.max)
      : s.min !== null
      ? fmt(s.min)
      : null;
  if (!range) return null;
  const period = s.period === "annual" ? "/yr" : `/${s.period}`;
  return `${cur} ${range}${period}`.trim();
}

/** Company initials fallback for Avatar */
function initials(company: string): string {
  return company
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function JobCard({ job, match, mustHave = [], keywords = [], targetTitles = [], onClick }: Props) {
  const { pct, label: levelLabel, color } = {
    pct: match.matchPercent,
    ...matchLevel(match.matchPercent),
  };
  const hasActiveCriteria = match.factors.some((f) => f.active);

  const salary = formatSalary(job);
  const locationSummary = job.location.worldwide
    ? "Worldwide"
    : [...job.location.countries, ...job.location.regions].slice(0, 3).join(", ") || "Location varies";

  return (
    <Card component="li" sx={{ listStyle: "none" }}>
      {/* CardActionArea must NOT contain interactive elements (links, buttons).
          SourceAttribution lives below it to avoid nested-interactive violations. */}
      <CardActionArea
        onClick={() => onClick(job)}
        aria-label={
          hasActiveCriteria
            ? `${job.title} at ${job.company}, ${pct}% ${levelLabel}`
            : `${job.title} at ${job.company}`
        }
      >
        <CardHeader
          avatar={
            <Avatar
              src={job.companyLogo ?? undefined}
              alt={`${job.company} logo`}
              sx={{ width: 40, height: 40 }}
            >
              {initials(job.company)}
            </Avatar>
          }
          title={
            <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 600 }}>
              <HighlightText
                text={job.title}
                terms={[...keywords, ...targetTitles]}
              />
            </Typography>
          }
          subheader={job.company}
          action={
            hasActiveCriteria ? (
              <Chip
                label={`${pct}% · ${levelLabel}`}
                color={color}
                size="small"
                sx={{ mt: 1, mr: 1 }}
              />
            ) : null
          }
        />
        <CardContent sx={{ pt: 0 }}>
          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              {[
                job.employmentType?.replace("_", " "),
                salary,
                locationSummary,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Typography>
            <BenefitChips benefits={match.benefits} mustHave={mustHave} />
          </Stack>
        </CardContent>
      </CardActionArea>

      {/* Attribution is outside the action area so the link isn't nested inside a button */}
      <Box sx={{ px: 2, pb: 1 }}>
        <SourceAttribution job={job} />
      </Box>
    </Card>
  );
}
