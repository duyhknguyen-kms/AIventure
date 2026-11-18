"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import { BENEFIT_DICTIONARY } from "@/lib/matching/benefits";
import type { BenefitKey, DetectedBenefit } from "@/lib/types";

export interface BenefitChipsProps {
  benefits: readonly DetectedBenefit[];
  /** The user's must-have benefits; found ones are highlighted, missing ones flagged. */
  mustHave?: readonly BenefitKey[];
  /** Chips shown before a "+N more" button; all chips when omitted. */
  maxVisible?: number;
}

type ChipKind = "must-have" | "missing" | "detected";

interface ChipEntry {
  key: BenefitKey;
  label: string;
  kind: ChipKind;
}

const LABELS: ReadonlyMap<BenefitKey, string> = new Map(BENEFIT_DICTIONARY.map((d) => [d.key, d.label]));

/** Must-have found first, then missing must-haves, then other detected benefits. */
export function benefitChipEntries(
  benefits: readonly DetectedBenefit[],
  mustHave: readonly BenefitKey[] = [],
): ChipEntry[] {
  const found = new Map(benefits.map((b) => [b.key, b.label]));
  const must = [...new Set(mustHave)];
  const entries: ChipEntry[] = [];
  for (const key of must) {
    if (found.has(key)) entries.push({ key, label: found.get(key) ?? key, kind: "must-have" });
  }
  for (const key of must) {
    if (!found.has(key)) entries.push({ key, label: LABELS.get(key) ?? key, kind: "missing" });
  }
  for (const benefit of benefits) {
    if (!must.includes(benefit.key)) entries.push({ key: benefit.key, label: benefit.label, kind: "detected" });
  }
  return entries;
}

function BenefitChip({ entry }: { entry: ChipEntry }) {
  if (entry.kind === "must-have") {
    return (
      <Chip
        component="li"
        color="primary"
        variant="filled"
        icon={<CheckCircleIcon aria-hidden="true" />}
        label={`${entry.label} · must-have`}
        data-testid="benefit-chip-must-have"
      />
    );
  }
  if (entry.kind === "missing") {
    return (
      <Chip
        component="li"
        variant="outlined"
        icon={<HighlightOffIcon aria-hidden="true" />}
        label={`${entry.label} · missing`}
        data-testid="benefit-chip-missing"
      />
    );
  }
  return <Chip component="li" variant="outlined" label={entry.label} data-testid="benefit-chip" />;
}

/**
 * Detected benefits as chips (SPEC §10.3, FR8). Must-have status is shown with
 * a filled chip, a check icon and the text "must-have"; a missing must-have
 * with an outlined chip, a cross icon and the text "missing" - never colour
 * alone (WCAG 1.4.1).
 */
export function BenefitChips({ benefits, mustHave = [], maxVisible }: BenefitChipsProps) {
  const [expanded, setExpanded] = useState(false);
  const entries = benefitChipEntries(benefits, mustHave);
  if (entries.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" data-testid="benefit-chips-empty">
        No benefits detected
      </Typography>
    );
  }

  const collapsible = maxVisible !== undefined && entries.length > Math.max(0, maxVisible);
  const visible = collapsible && !expanded ? entries.slice(0, Math.max(0, maxVisible)) : entries;
  const hidden = entries.length - Math.min(entries.length, Math.max(0, maxVisible ?? entries.length));

  return (
    <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 1, alignItems: "center" }}>
      <Stack
        component="ul"
        aria-label="Benefits"
        direction="row"
        useFlexGap
        data-testid="benefit-chips"
        sx={{ flexWrap: "wrap", gap: 1, listStyle: "none", m: 0, p: 0 }}
      >
        {visible.map((entry) => (
          <BenefitChip key={`${entry.kind}:${entry.key}`} entry={entry} />
        ))}
      </Stack>
      {collapsible && (
        // The button stays in place when toggled, so keyboard focus is kept.
        <Button
          size="small"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          data-testid="benefit-chips-toggle-button"
        >
          {expanded ? "Show fewer" : `Show ${hidden} more`}
        </Button>
      )}
    </Stack>
  );
}

export default BenefitChips;
