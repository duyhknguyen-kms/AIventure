"use client";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import type { SourceStatus } from "@/lib/types";

interface Props {
  sources: SourceStatus[];
  onRetry: () => void;
}

const SOURCE_LABEL: Record<string, string> = {
  himalayas: "Himalayas",
  remotive: "Remotive",
};

export default function SourceStatusBanner({ sources, onRetry }: Props) {
  // Only show when a source actually failed.
  // ok=true + cached=true is a normal cache hit — not a problem.
  const degraded = sources.filter((s) => !s.ok);
  if (degraded.length === 0) return null;

  const allDown = sources.every((s) => !s.ok && s.count === 0);
  const severity = allDown ? "error" : "warning";

  return (
    <Alert
      severity={severity}
      action={
        <Button color="inherit" size="small" onClick={onRetry}>
          Retry
        </Button>
      }
    >
      <AlertTitle>{allDown ? "All sources unavailable" : "Some sources unavailable"}</AlertTitle>
      <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
        {degraded.map((s) => (
          <li key={s.name}>
            <strong>{SOURCE_LABEL[s.name] ?? s.name}</strong>
            {s.error ? ` – ${s.error}` : ""}
            {s.cached && !s.ok ? " (showing cached data)" : ""}
          </li>
        ))}
      </Stack>
    </Alert>
  );
}
