"use client";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import type { Job } from "@/lib/types";

interface Props {
  job: Pick<Job, "source" | "sourceUrl" | "title">;
}

const SOURCE_LABEL: Record<string, string> = {
  himalayas: "Himalayas",
  remotive: "Remotive",
};

export default function SourceAttribution({ job }: Props) {
  const label = SOURCE_LABEL[job.source] ?? job.source;

  return (
    <Typography variant="caption" component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      Source:{" "}
      <Link
        href={job.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`View ${job.title} on ${label} (opens in new tab)`}
        sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}
      >
        {label}
        <OpenInNewIcon sx={{ fontSize: "0.75rem" }} aria-hidden="true" />
      </Link>
    </Typography>
  );
}
