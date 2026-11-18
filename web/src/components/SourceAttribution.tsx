"use client";

import { Fragment } from "react";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { SOURCE_LABEL } from "@/lib/format";
import type { Job } from "@/lib/types";

export type SourceAttributionProps = Pick<Job, "source" | "sourceUrl" | "alsoOn"> & {
  /** Job title, used in each link's accessible name. */
  jobTitle: string;
};

interface SourceLinkProps {
  href: string;
  label: string;
  jobTitle: string;
  testId: string;
}

function SourceLink({ href, label, jobTitle, testId }: SourceLinkProps) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View ${jobTitle} on ${label} (opens in new tab)`}
      data-testid={testId}
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.25, minHeight: 24 }}
    >
      {label}
      <OpenInNewIcon fontSize="inherit" aria-hidden="true" />
    </Link>
  );
}

/**
 * Source credit required by the Himalayas and Remotive terms (SPEC §10.3,
 * §11): "Source: Himalayas" linking to the listing, plus "Also on" links for
 * records merged by dedupe. Links open in a new tab and say so (WCAG 2.4.4).
 */
export function SourceAttribution({ source, sourceUrl, alsoOn, jobTitle }: SourceAttributionProps) {
  // Only list other sources; dedupe never adds the primary one, but guard anyway.
  const others = alsoOn.filter((entry) => entry.source !== source);
  return (
    <Typography variant="caption" component="p" data-testid="source-attribution" sx={{ m: 0 }}>
      Source:{" "}
      <SourceLink href={sourceUrl} label={SOURCE_LABEL[source]} jobTitle={jobTitle} testId="source-attribution-link" />
      {others.length > 0 && (
        <>
          {" · Also on: "}
          {others.map((entry, index) => (
            <Fragment key={`${entry.source}:${entry.url}`}>
              {index > 0 && ", "}
              <SourceLink
                href={entry.url}
                label={SOURCE_LABEL[entry.source]}
                jobTitle={jobTitle}
                testId="source-attribution-also-on-link"
              />
            </Fragment>
          ))}
        </>
      )}
    </Typography>
  );
}

export default SourceAttribution;
