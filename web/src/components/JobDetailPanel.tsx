"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LaunchIcon from "@mui/icons-material/Launch";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import WorkOutlineIcon from "@mui/icons-material/WorkOutlined";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { SourceAttribution } from "@/components/SourceAttribution";
import {
  formatEmploymentType,
  formatLocation,
  formatPostedDate,
  formatSalary,
  matchBadgeLabel,
  matchLevel,
} from "@/lib/format";
import type { BenefitKey, Job, MatchResult } from "@/lib/types";

const DRAWER_WIDTH = 480;

export interface JobDetailPanelProps {
  job: Job | null;
  match: MatchResult | null;
  mustHave?: readonly BenefitKey[];
  onClose: () => void;
  anchorEl?: HTMLElement | null;
}

function EvidenceSection({ job, match }: { job: Job; match: MatchResult }) {
  const [open, setOpen] = useState(false);
  const benefitsWithEvidence = match.benefits.filter((b) => b.evidence.length > 0);
  if (benefitsWithEvidence.length === 0) return null;

  return (
    <Box>
      <Button
        size="small"
        endIcon={
          <ExpandMoreIcon
            aria-hidden="true"
            sx={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
          />
        }
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-testid="evidence-toggle"
        sx={{ color: "text.secondary", textTransform: "none", pl: 0 }}
      >
        {open ? "Hide evidence" : "Show benefit evidence"}
      </Button>
      <Collapse in={open}>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          {benefitsWithEvidence.map((b) => (
            <Box key={b.key}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 0.5 }}>
                {b.label}
              </Typography>
              {b.evidence.map((snippet, i) => (
                <Box
                  key={i}
                  component="blockquote"
                  sx={{
                    m: 0,
                    mb: 0.75,
                    pl: 1.5,
                    borderLeft: "3px solid",
                    borderColor: "primary.light",
                    color: "text.secondary",
                    fontStyle: "italic",
                    fontSize: "0.8rem",
                  }}
                >
                  &ldquo;…{snippet}…&rdquo;
                </Box>
              ))}
            </Box>
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
}

function PanelContent({ job, match, mustHave = [], onClose }: {
  job: Job;
  match: MatchResult;
  mustHave?: readonly BenefitKey[];
  onClose: () => void;
}) {
  const level = matchLevel(match.matchPercent);
  const levelColor =
    level === "Strong" ? "success.main" : level === "Medium" ? "warning.dark" : "text.secondary";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Sticky header */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
          px: 2.5,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <IconButton
          onClick={onClose}
          aria-label="Close job details"
          data-testid="detail-close-button"
          size="small"
          edge="start"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Chip
            label={matchBadgeLabel(match.matchPercent)}
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: "0.75rem",
              color: levelColor,
              bgcolor: `${levelColor.split(".")[0]}.50` as never,
              border: "1px solid",
              borderColor: levelColor,
            }}
          />
        </Box>
        <Button
          variant="contained"
          size="small"
          endIcon={<LaunchIcon fontSize="small" aria-hidden="true" />}
          href={job.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Apply for ${job.title} (opens in new tab)`}
          data-testid="detail-apply-button"
          disableElevation
          sx={{ whiteSpace: "nowrap" }}
        >
          Apply
        </Button>
      </Box>

      {/* Scrollable body */}
      <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, py: 2 }}>
        {/* Job title */}
        <Typography
          variant="h5"
          component="h2"
          id="detail-title"
          sx={{ fontWeight: 800, lineHeight: 1.3, mb: 0.5 }}
        >
          {job.title}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 500, mb: 2 }}>
          {job.company}
        </Typography>

        {/* Meta chips */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 2 }}>
          {formatEmploymentType(job.employmentType) && (
            <Chip
              icon={<WorkOutlineIcon fontSize="small" aria-hidden="true" />}
              label={formatEmploymentType(job.employmentType) as string}
              size="small"
              variant="outlined"
              sx={{ borderColor: "divider" }}
            />
          )}
          <Chip
            icon={<AttachMoneyIcon fontSize="small" aria-hidden="true" />}
            label={formatSalary(job.salary)}
            size="small"
            variant="outlined"
            sx={{ borderColor: "divider" }}
          />
          <Chip
            icon={<PlaceOutlinedIcon fontSize="small" aria-hidden="true" />}
            label={formatLocation(job.location)}
            size="small"
            variant="outlined"
            sx={{ borderColor: "divider" }}
          />
        </Box>

        {formatPostedDate(job.publishedAt) && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            Posted {formatPostedDate(job.publishedAt)}
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Score breakdown */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: "text.secondary" }}>
          MATCH SCORE
        </Typography>
        <ScoreBreakdown match={match} />

        <Divider sx={{ my: 2 }} />

        {/* Evidence */}
        <EvidenceSection job={job} match={match} />

        <Divider sx={{ my: 2 }} />

        {/* Description */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "text.secondary" }}>
          DESCRIPTION
        </Typography>
        <Typography
          variant="body2"
          component="pre"
          sx={{
            whiteSpace: "pre-line",
            fontFamily: "inherit",
            color: "text.primary",
            lineHeight: 1.7,
            fontSize: "0.85rem",
            m: 0,
          }}
          data-testid="detail-description"
        >
          {job.descriptionText}
        </Typography>

        <Divider sx={{ my: 2 }} />

        {/* Source / apply links */}
        <SourceAttribution
          source={job.source}
          sourceUrl={job.sourceUrl}
          alsoOn={job.alsoOn}
          jobTitle={job.title}
        />

        {job.alsoOn.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
            {job.alsoOn.map(({ source, url }) => (
              <Link
                key={source}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                variant="caption"
                aria-label={`Also on ${source === "himalayas" ? "Himalayas" : "Remotive"} (opens in new tab)`}
              >
                Also on {source === "himalayas" ? "Himalayas" : "Remotive"}
              </Link>
            ))}
          </Stack>
        )}

        {/* Bottom Apply */}
        <Box sx={{ mt: 3, mb: 1 }}>
          <Button
            variant="contained"
            fullWidth
            endIcon={<LaunchIcon aria-hidden="true" />}
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Apply for ${job.title} (opens in new tab)`}
            disableElevation
            size="large"
          >
            Apply for this role
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

/**
 * Job detail panel (SPEC §10.3, FR9.2). Right-anchored Drawer on ≥md,
 * full-screen Dialog on <md. Focus trap and Esc to close are handled by MUI.
 */
export function JobDetailPanel({ job, match, mustHave = [], onClose, anchorEl }: JobDetailPanelProps) {
  const isSmall = useMediaQuery("(max-width:899px)");

  if (job === null || match === null) return null;

  const j = job;
  const m = match;
  const content = (
    <PanelContent job={j} match={m} mustHave={mustHave} onClose={onClose} />
  );

  if (isSmall) {
    return (
      <Dialog
        open
        fullScreen
        onClose={onClose}
        aria-labelledby="detail-title"
        data-testid="detail-panel"
      >
        <DialogTitle id="detail-title" sx={{ display: "none" }}>
          {j.title}
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>{content}</DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer
      anchor="right"
      open
      variant="persistent"
      onClose={onClose}
      aria-labelledby="detail-title"
      data-testid="detail-panel"
      slotProps={{
        paper: {
          sx: {
            width: DRAWER_WIDTH,
            maxWidth: "100vw",
            boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
          },
        },
      }}
    >
      {content}
    </Drawer>
  );
}

export default JobDetailPanel;
