"use client";
import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";

/**
 * §10.3 — Polite aria-live region for result-count announcements.
 * Visually hidden; debounced 500 ms so rapid re-ranks don't spam the reader.
 */
interface Props {
  message: string;
}

export default function LiveAnnouncer({ message }: Props) {
  const [announced, setAnnounced] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAnnounced(message), 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [message]);

  return (
    <Box
      role="status"
      aria-live="polite"
      aria-atomic="true"
      sx={{
        position: "absolute",
        width: "1px",
        height: "1px",
        overflow: "hidden",
        clip: "rect(0 0 0 0)",
        whiteSpace: "nowrap",
      }}
    >
      {announced}
    </Box>
  );
}
