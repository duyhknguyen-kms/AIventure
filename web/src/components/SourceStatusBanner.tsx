"use client";

import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { SOURCE_LABEL } from "@/lib/format";
import type { SourceStatus } from "@/lib/types";

export const REMOTIVE_DELAY_NOTE = "Remotive listings may be delayed by 24 hours.";

export interface SourceStatusBannerProps {
  sources: readonly SourceStatus[];
  onRetry: () => void;
  /**
   * "partial": some sources failed, results from the others are shown
   * (warning). "total": nothing could be loaded (error, always shown).
   */
  variant?: "partial" | "total";
  /** Error text for a total failure without per-source details. */
  error?: string;
  retryDisabled?: boolean;
}

/** A source that failed, or was served from a stale cache after a failed refresh. */
export function hasSourceProblem(source: SourceStatus): boolean {
  return !source.ok || (source.cached && source.error !== undefined);
}

function describe(source: SourceStatus): string {
  const name = SOURCE_LABEL[source.name];
  if (!source.ok) return `${name} unavailable${source.error ? `: ${source.error}` : ""}`;
  return `${name}: showing saved results, the latest refresh failed${source.error ? ` (${source.error})` : ""}`;
}

function partialTitle(problems: readonly SourceStatus[], sources: readonly SourceStatus[]): string {
  const failed = problems.filter((source) => !source.ok);
  const healthy = sources.filter((source) => source.ok).map((source) => SOURCE_LABEL[source.name]);
  if (failed.length === 0) return "Some results may be out of date";
  const names = failed.map((source) => SOURCE_LABEL[source.name]).join(" and ");
  return healthy.length > 0 ? `${names} unavailable – showing ${healthy.join(" and ")} only` : `${names} unavailable`;
}

/**
 * Source health banner (SPEC §10.3, §10.4, FR1.3). MUI `Alert` carries
 * `role="alert"`, so the problem is announced without moving focus; the
 * severity icon and the text say what happened, not colour alone (WCAG 1.4.1).
 */
export function SourceStatusBanner({
  sources,
  onRetry,
  variant = "partial",
  error,
  retryDisabled = false,
}: SourceStatusBannerProps) {
  const problems = sources.filter(hasSourceProblem);
  if (variant === "partial" && problems.length === 0) return null;

  const isTotal = variant === "total";
  const title = isTotal ? "Job sources are unavailable" : partialTitle(problems, sources);
  const remotiveAffected = problems.some((source) => source.name === "remotive");

  return (
    <Alert
      severity={isTotal ? "error" : "warning"}
      data-testid={isTotal ? "source-status-total-failure" : "source-status-banner"}
      action={
        <Button
          color="inherit"
          variant="outlined"
          onClick={onRetry}
          disabled={retryDisabled}
          data-testid="source-status-retry-button"
        >
          Retry
        </Button>
      }
      sx={{ alignItems: "flex-start" }}
    >
      <AlertTitle>{title}</AlertTitle>
      {isTotal && error && problems.length === 0 && <Box component="p" sx={{ m: 0 }}>{error}</Box>}
      {problems.length > 0 && (
        <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
          {problems.map((source) => (
            <li key={source.name}>{describe(source)}</li>
          ))}
        </Box>
      )}
      {remotiveAffected && <Box component="p" sx={{ mt: 1, mb: 0 }}>{REMOTIVE_DELAY_NOTE}</Box>}
    </Alert>
  );
}

export default SourceStatusBanner;
