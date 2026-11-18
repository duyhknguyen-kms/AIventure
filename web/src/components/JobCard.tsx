"use client";

import { useId } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import WorkOutlineIcon from "@mui/icons-material/WorkOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { BenefitChips } from "@/components/BenefitChips";
import { SourceAttribution } from "@/components/SourceAttribution";
import {
  formatEmploymentType,
  formatLocation,
  formatPostedDate,
  formatSalary,
  initials,
  matchBadgeLabel,
  matchLevel,
  type MatchLevel,
} from "@/lib/format";
import type { BenefitKey, Job, MatchResult } from "@/lib/types";

export const CARD_VISIBLE_BENEFITS = 5;

export interface JobCardProps {
  job: Job;
  match: MatchResult;
  mustHave?: readonly BenefitKey[];
  onSelect?: (job: Job) => void;
}

/** Semi-transparent badge backgrounds — work in both light and dark mode. */
const BADGE_BG: Readonly<Record<MatchLevel, string>> = {
  Strong: "rgba(27,94,32,0.12)",
  Medium: "rgba(138,75,0,0.12)",
  Low: "rgba(128,128,128,0.10)",
};

function CompanyAvatar({ company, logo }: { company: string; logo: string | null }) {
  const fallback = initials(company);
  if (logo) {
    return (
      <Avatar
        src={logo}
        alt={`${company} logo`}
        data-testid="job-card-logo"
        sx={{
          width: 48,
          height: 48,
          bgcolor: "action.hover",
          border: "2px solid",
          borderColor: "divider",
          "& img": { objectFit: "contain", p: "4px" },
        }}
      >
        {fallback}
      </Avatar>
    );
  }
  return (
    <Avatar
      aria-hidden="true"
      data-testid="job-card-initials"
      sx={{
        width: 48,
        height: 48,
        bgcolor: "primary.main",
        color: "primary.contrastText",
        fontWeight: 700,
        fontSize: "1rem",
      }}
    >
      {fallback}
    </Avatar>
  );
}

function MetaChip({ icon, label, testId }: { icon: React.ReactNode; label: string; testId: string }) {
  return (
    <Chip
      icon={<Box sx={{ "& svg": { fontSize: "0.9rem !important" } }}>{icon}</Box>}
      label={label}
      size="small"
      variant="outlined"
      data-testid={testId}
      sx={{
        fontSize: "0.775rem",
        height: 26,
        borderColor: "divider",
        bgcolor: "action.hover",
        "& .MuiChip-icon": { ml: "6px", mr: "-2px", color: "text.secondary" },
      }}
    />
  );
}

export function JobCard({ job, match, mustHave = [], onSelect }: JobCardProps) {
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const companyId = `${baseId}-company`;
  const level = matchLevel(match.matchPercent);
  const employment = formatEmploymentType(job.employmentType);
  const posted = formatPostedDate(job.publishedAt);
  const salary = formatSalary(job.salary);
  const location = formatLocation(job.location);

  const titleText = onSelect ? (
    <CardActionArea
      onClick={() => onSelect(job)}
      data-testid="job-card-action"
      sx={{
        position: "static",
        font: "inherit",
        textAlign: "left",
        "&::after": { content: '""', position: "absolute", inset: 0 },
      }}
    >
      {job.title}
    </CardActionArea>
  ) : (
    job.title
  );

  return (
    <Card
      component="article"
      variant="outlined"
      aria-labelledby={`${titleId} ${companyId}`}
      data-testid="job-card"
      sx={{
        position: "relative",
        height: "100%",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        "&:hover": {
          transform: "translateY(-3px)",
          boxShadow: "0 8px 32px rgba(26,86,219,0.14)",
          borderColor: "primary.light",
        },
        "&:focus-within": {
          borderColor: "primary.main",
          boxShadow: "0 0 0 3px rgba(26,86,219,0.12)",
        },
        transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        {/* Header: avatar + title + badge */}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start", mb: 1.5 }}>
          <CompanyAvatar company={job.company} logo={job.companyLogo} />

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
              <Typography
                variant="subtitle1"
                component="h3"
                id={titleId}
                sx={{ fontWeight: 700, lineHeight: 1.3, fontSize: "0.95rem", pr: 1 }}
              >
                {titleText}
              </Typography>
              <Box
                sx={{
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  bgcolor: BADGE_BG[level],
                  borderRadius: 2,
                  px: 1,
                  py: 0.5,
                }}
              >
                <TrendingUpIcon
                  sx={{
                    fontSize: "0.9rem",
                    color: level === "Strong" ? "success.main" : level === "Medium" ? "warning.main" : "text.secondary",
                  }}
                  aria-hidden="true"
                />
                <Typography
                  variant="caption"
                  component="span"
                  data-testid="job-card-match-badge"
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    color: level === "Strong" ? "success.main" : level === "Medium" ? "warning.main" : "text.secondary",
                  }}
                >
                  {matchBadgeLabel(match.matchPercent)}
                </Typography>
              </Box>
            </Stack>

            <Typography
              variant="body2"
              id={companyId}
              color="text.secondary"
              sx={{ fontWeight: 500, mt: 0.25 }}
            >
              {job.company}
            </Typography>
          </Box>
        </Stack>

        {/* Meta chips */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1.5 }}>
          {employment && (
            <MetaChip icon={<WorkOutlineIcon />} label={employment} testId="job-card-employment" />
          )}
          <MetaChip icon={<AttachMoneyIcon />} label={salary} testId="job-card-salary" />
          <MetaChip
            icon={<PlaceOutlinedIcon />}
            label={location + (match.locationUncertain ? " (location uncertain, check the listing)" : "")}
            testId="job-card-location"
          />
        </Box>

        {/* Benefits */}
        <Box sx={{ position: "relative", zIndex: 1 }}>
          <BenefitChips benefits={match.benefits} mustHave={mustHave} maxVisible={CARD_VISIBLE_BENEFITS} />
        </Box>

        {/* Footer: posted date + source */}
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            mt: 1.5,
            pt: 1.5,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          {posted && (
            <Typography variant="caption" color="text.disabled">
              {posted}
            </Typography>
          )}
          <Box sx={{ ml: "auto", position: "relative", zIndex: 1 }}>
            <SourceAttribution
              source={job.source}
              sourceUrl={job.sourceUrl}
              alsoOn={job.alsoOn}
              jobTitle={job.title}
            />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default JobCard;
