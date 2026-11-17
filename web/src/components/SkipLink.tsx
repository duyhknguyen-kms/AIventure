"use client";
import Link from "@mui/material/Link";

/**
 * §10.5 — Skip-to-main link. Visually hidden until focused.
 * Must be the first focusable element in the DOM.
 */
export default function SkipLink() {
  return (
    <Link
      href="#main"
      sx={{
        position: "absolute",
        left: "-9999px",
        top: "auto",
        width: "1px",
        height: "1px",
        overflow: "hidden",
        zIndex: 9999,
        "&:focus": {
          position: "fixed",
          top: 8,
          left: 8,
          width: "auto",
          height: "auto",
          overflow: "visible",
          px: 2,
          py: 1,
          bgcolor: "background.paper",
          border: "2px solid",
          borderColor: "primary.main",
          borderRadius: 1,
        },
      }}
    >
      Skip to job results
    </Link>
  );
}
