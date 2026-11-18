"use client";

import Link from "@mui/material/Link";
import { visuallyHidden } from "@/components/visuallyHidden";

export interface SkipLinkProps {
  /** Id of the element to jump to, without "#". */
  targetId?: string;
  label?: string;
}

/**
 * First focusable element on the page (SPEC §10.3, WCAG 2.4.1). Visually
 * hidden until it receives keyboard focus, then shown over the app bar.
 */
export function SkipLink({ targetId = "main", label = "Skip to job results" }: SkipLinkProps) {
  return (
    <Link
      href={`#${targetId}`}
      data-testid="skip-link"
      sx={(theme) => ({
        ...visuallyHidden,
        "&:focus, &:focus-visible": {
          clip: "auto",
          clipPath: "none",
          height: "auto",
          width: "auto",
          margin: 0,
          overflow: "visible",
          whiteSpace: "normal",
          position: "fixed",
          top: theme.spacing(1),
          left: theme.spacing(1),
          zIndex: theme.zIndex.tooltip + 1,
          padding: theme.spacing(1, 2),
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.primary.main,
          boxShadow: theme.shadows[4],
          borderRadius: `${theme.shape.borderRadius}px`,
        },
      })}
    >
      {label}
    </Link>
  );
}

export default SkipLink;
