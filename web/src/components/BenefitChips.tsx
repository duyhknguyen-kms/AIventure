"use client";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import type { DetectedBenefit, BenefitKey } from "@/lib/types";

interface Props {
  benefits: DetectedBenefit[];
  mustHave?: BenefitKey[];
}

export default function BenefitChips({ benefits, mustHave = [] }: Props) {
  if (benefits.length === 0 && mustHave.length === 0) return null;

  const detectedKeys = new Set(benefits.map((b) => b.key));

  // Show detected benefits
  const chips = benefits.map((b) => {
    const isMust = mustHave.includes(b.key);
    return (
      <Chip
        key={b.key}
        label={b.label}
        size="small"
        variant={isMust ? "filled" : "outlined"}
        color={isMust ? "success" : "default"}
        icon={isMust ? <CheckCircleIcon aria-hidden="true" /> : undefined}
      />
    );
  });

  // Show missing must-haves
  const missingMust = mustHave.filter((k) => !detectedKeys.has(k));
  const missingChips = missingMust.map((k) => (
    <Chip
      key={`missing-${k}`}
      label={`${k.replace(/_/g, " ")} (missing)`}
      size="small"
      variant="outlined"
      color="default"
      icon={<RadioButtonUncheckedIcon aria-hidden="true" />}
      sx={{ opacity: 0.6 }}
    />
  ));

  return (
    <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap" }}>
      {chips}
      {missingChips}
    </Stack>
  );
}
