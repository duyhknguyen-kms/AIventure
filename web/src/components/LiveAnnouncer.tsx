"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import { visuallyHidden } from "@/components/visuallyHidden";

export const ANNOUNCE_DEBOUNCE_MS = 500;

export interface LiveAnnouncerProps {
  /** Latest status text, e.g. "Showing 42 jobs, sorted by match". */
  message: string;
  /** Delay before the message is placed in the live region (default 500 ms). */
  debounceMs?: number;
}

/**
 * Polite status region (SPEC §10.3, WCAG 4.1.3). The region is always in the
 * DOM, so screen readers notice later changes; quick successive messages are
 * debounced and only the last one is announced. Focus is never moved.
 */
export function LiveAnnouncer({ message, debounceMs = ANNOUNCE_DEBOUNCE_MS }: LiveAnnouncerProps) {
  const [announced, setAnnounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setAnnounced(message), debounceMs);
    return () => clearTimeout(timer);
  }, [message, debounceMs]);

  return (
    <Box role="status" aria-live="polite" aria-atomic="true" data-testid="live-announcer" sx={visuallyHidden}>
      {announced}
    </Box>
  );
}

export default LiveAnnouncer;
