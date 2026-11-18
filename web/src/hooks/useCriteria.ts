"use client";
/**
 * §6 — Criteria persistence
 * Reads/writes CriteriaSchema from localStorage, debounced 300 ms.
 * Guards against SSR by only accessing localStorage inside useEffect.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CriteriaSchema,
  DEFAULT_CRITERIA,
  CRITERIA_STORAGE_KEY,
  type Criteria,
} from "@/lib/matching/criteria";

export function useCriteria(): [Criteria, (next: Criteria) => void] {
  const [criteria, setCriteria] = useState<Criteria>(DEFAULT_CRITERIA);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstMount = useRef(true);

  // Read from localStorage on mount (SSR-safe)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CRITERIA_STORAGE_KEY);
      if (raw) {
        const parsed = CriteriaSchema.safeParse(JSON.parse(raw));
        if (parsed.success) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setCriteria(parsed.data);
        }
      }
    } catch {
      // corrupted storage — use default
    }
  }, []);

  // Write to localStorage (debounced 300 ms), skip the initial mount
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(CRITERIA_STORAGE_KEY, JSON.stringify(criteria));
      } catch {
        // quota exceeded or private browsing — ignore
      }
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [criteria]);

  const update = useCallback((next: Criteria) => {
    setCriteria(next);
  }, []);

  return [criteria, update];
}
