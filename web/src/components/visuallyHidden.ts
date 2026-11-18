import type { SxProps, Theme } from "@mui/material/styles";

/** Hidden on screen, still read by screen readers (the usual "sr-only" pattern). */
export const visuallyHidden = {
  border: 0,
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: 0,
  position: "absolute",
  whiteSpace: "nowrap",
  width: "1px",
} as const satisfies SxProps<Theme>;
