"use client";
/**
 * §10.3 — JobDetailPanel
 * Modal Dialog showing full job details, score breakdown, benefits + evidence,
 * description as plain text, Apply button, and source attribution.
 * Close button returns focus to the opening card (MUI Dialog default).
 */
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import LaunchIcon from "@mui/icons-material/Launch";
import BenefitChips from "./BenefitChips";
import ScoreBreakdown from "./ScoreBreakdown";
import SourceAttribution from "./SourceAttribution";
import type { Job, MatchResult, BenefitKey } from "@/lib/types";

interface Props {
  job: Job | null;
  match: MatchResult | null;
  mustHave?: BenefitKey[];
  open: boolean;
  onClose: () => void;
}

const SOURCE_LABEL: Record<string, string> = {
  himalayas: "Himalayas",
  remotive: "Remotive",
};

export default function JobDetailPanel({ job, match, mustHave = [], open, onClose }: Props) {
  if (!job || !match) return null;

  const titleId = `job-detail-title-${job.id.replace(/[^a-z0-9]/gi, "-")}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby={titleId}
      maxWidth="md"
      fullWidth
      scroll="paper"
    >
      {/* ── Title row ─────────────────────────────────────────────────── */}
      <DialogTitle id={titleId} sx={{ pr: 6 }}>
        <Typography component="span" variant="h6">
          {job.title}
        </Typography>
        <Typography variant="subtitle2" color="text.secondary" sx={{ display: "block" }}>
          {job.company}
          {job.employmentType && ` · ${job.employmentType.replace("_", " ")}`}
        </Typography>
        <IconButton
          aria-label="Close job details"
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Match badge + chips */}
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Chip
              label={`${match.matchPercent}% match`}
              color={
                match.matchPercent >= 75 ? "success" :
                match.matchPercent >= 50 ? "warning" : "error"
              }
            />
            {job.salary && (
              <Chip
                label={[
                  job.salary.currency,
                  job.salary.min !== null ? `${Math.round(job.salary.min / 1000)}k` : null,
                  job.salary.max !== null ? `–${Math.round(job.salary.max / 1000)}k` : null,
                  `/${job.salary.period}`,
                ].filter(Boolean).join("")}
                variant="outlined"
              />
            )}
          </Stack>

          {/* Score breakdown */}
          <ScoreBreakdown factors={match.factors} matchPercent={match.matchPercent} />

          <Divider />

          {/* Detected benefits */}
          {match.benefits.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Detected benefits
              </Typography>
              <BenefitChips benefits={match.benefits} mustHave={mustHave} />

              {/* Evidence quotes */}
              <Stack spacing={1} sx={{ mt: 1 }}>
                {match.benefits.flatMap((b) =>
                  b.evidence.map((snippet, i) => (
                    <Box
                      key={`${b.key}-${i}`}
                      component="blockquote"
                      sx={{ m: 0, pl: 2, borderLeft: "3px solid", borderColor: "divider" }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        "{snippet}"
                      </Typography>
                    </Box>
                  ))
                )}
              </Stack>
            </Box>
          )}

          <Divider />

          {/* Description (plain text — NEVER dangerouslySetInnerHTML) */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Description
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ whiteSpace: "pre-line", maxHeight: 300, overflowY: "auto" }}
            >
              {job.descriptionText || "No description available."}
            </Typography>
          </Box>

          <Divider />

          {/* Source attribution + alsoOn */}
          <Box>
            <SourceAttribution job={job} />
            {job.alsoOn.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: "wrap" }}>
                <Typography variant="caption" color="text.secondary">
                  Also on:
                </Typography>
                {job.alsoOn.map((ref) => (
                  <Link
                    key={ref.source}
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="caption"
                    aria-label={`View ${job.title} on ${SOURCE_LABEL[ref.source] ?? ref.source} (opens in new tab)`}
                  >
                    {SOURCE_LABEL[ref.source] ?? ref.source}
                  </Link>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </DialogContent>

      {/* ── Actions ───────────────────────────────────────────────────── */}
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          component="a"
          href={job.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Apply for ${job.title} (opens in new tab)`}
          endIcon={<LaunchIcon aria-hidden="true" />}
        >
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}
