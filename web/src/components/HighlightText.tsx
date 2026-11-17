"use client";
/**
 * Splits `text` into plain and highlighted segments, rendering matched terms
 * inside <mark> elements.
 *
 * Uses the same word-boundary + hyphen-normalisation logic as filters.ts
 * so highlighted terms always match what the engine actually scored.
 *
 * Accessibility: colour is used alongside bold weight, not alone (WCAG 1.4.1).
 * A visually-hidden "Highlighted:" prefix precedes the first mark per block
 * so screen readers that don't announce <mark> still convey meaning.
 */
import { useMemo } from "react";
import Box from "@mui/material/Box";

interface Segment {
  text: string;
  type: "plain" | "match" | "warn";
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normaliseHyphens(s: string): string {
  return s.replace(/-/g, " ");
}

function buildPattern(terms: string[]): RegExp | null {
  const unique = [...new Set(terms.map((t) => normaliseHyphens(t.toLowerCase()).trim()).filter(Boolean))];
  if (!unique.length) return null;
  // Sort longest first so overlapping terms prefer the longer match
  unique.sort((a, b) => b.length - a.length);
  return new RegExp(`\\b(${unique.map(escapeRegex).join("|")})\\b`, "gi");
}

function segment(text: string, matchRe: RegExp | null, warnRe: RegExp | null): Segment[] {
  if (!matchRe && !warnRe) return [{ text, type: "plain" }];

  // Build combined regex with named groups to distinguish match vs warn
  const parts: string[] = [];
  if (matchRe) parts.push(`(?<match>${matchRe.source})`);
  if (warnRe)  parts.push(`(?<warn>${warnRe.source})`);
  const combined = new RegExp(parts.join("|"), "gi");

  // Normalise hyphens in source text too so "on-site" highlights "on site"
  const normText = normaliseHyphens(text);

  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combined.exec(normText)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), type: "plain" });
    }
    // Use original text slice (not normalised) to preserve original formatting
    const originalSlice = text.slice(match.index, match.index + match[0].length);
    const type = match.groups?.match !== undefined ? "match" : "warn";
    segments.push({ text: originalSlice, type });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), type: "plain" });
  }

  return segments;
}

interface Props {
  text: string;
  /** Terms highlighted in primary/success colour (matched criteria) */
  terms?: string[];
  /** Terms highlighted in error colour (excluded keywords — shown as warning) */
  warnTerms?: string[];
  component?: React.ElementType;
}

export default function HighlightText({
  text,
  terms = [],
  warnTerms = [],
  component: Component = "span",
}: Props) {
  const matchRe = useMemo(() => buildPattern(terms), [terms]);
  const warnRe  = useMemo(() => buildPattern(warnTerms), [warnTerms]);
  const segments = useMemo(() => segment(text, matchRe, warnRe), [text, matchRe, warnRe]);

  const hasHighlight = segments.some((s) => s.type !== "plain");

  return (
    <Component>
      {hasHighlight && (
        <Box
          component="span"
          sx={{
            position: "absolute",
            width: "1px",
            height: "1px",
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
            whiteSpace: "nowrap",
          }}
        >
          Contains highlighted matches.{" "}
        </Box>
      )}
      {segments.map((seg, i) => {
        if (seg.type === "plain") return seg.text;
        return (
          <Box
            key={i}
            component="mark"
            sx={{
              bgcolor: seg.type === "warn" ? "error.light" : "warning.light",
              color: "inherit",
              fontWeight: 700,
              borderRadius: "2px",
              px: "1px",
            }}
          >
            {seg.text}
          </Box>
        );
      })}
    </Component>
  );
}
