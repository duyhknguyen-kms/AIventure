"use client";

import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import {
  CRITERIA_STORAGE_KEY,
  type Criteria,
  CriteriaSchema,
  DEFAULT_CRITERIA,
} from "@/lib/matching/criteria";

/**
 * Criteria persistence (SPEC §6, FR5 / FR5.1).
 *
 * - Reads `localStorage[CRITERIA_STORAGE_KEY]` only inside `useEffect`, so
 *   server rendering and the first client render both use `DEFAULT_CRITERIA`
 *   and hydration matches.
 * - Stored data goes through `CriteriaSchema.safeParse`; missing or invalid
 *   data falls back to `DEFAULT_CRITERIA`.
 * - Changes are written back as full JSON, debounced by 300 ms. A pending
 *   write is flushed on unmount so the last edit is not lost.
 * - Storage errors (disabled storage, quota exceeded) are recoverable: they
 *   are logged with `console.warn` and the in-memory criteria keep working.
 */

export const CRITERIA_WRITE_DEBOUNCE_MS = 300;

const LOG_PREFIX = "[useCriteria]";

function errorMessage(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

/** Returns `window.localStorage`, or null when it is unavailable or blocked. */
function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    const storage: Storage | undefined = window.localStorage;
    if (!storage) {
      console.warn(`${LOG_PREFIX} localStorage is not available; criteria will not persist.`);
      return null;
    }
    return storage;
  } catch (error) {
    console.warn(`${LOG_PREFIX} localStorage is not available: ${errorMessage(error)}`);
    return null;
  }
}

/**
 * Validates a stored criteria string. Missing input returns the defaults
 * quietly; malformed JSON or schema-invalid data returns the defaults with a
 * warning.
 */
export function parseStoredCriteria(raw: string | null): Criteria {
  if (raw === null || raw === "") return DEFAULT_CRITERIA;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    console.warn(`${LOG_PREFIX} stored criteria is not valid JSON; using defaults. ${errorMessage(error)}`);
    return DEFAULT_CRITERIA;
  }
  const result = CriteriaSchema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
    console.warn(`${LOG_PREFIX} stored criteria failed validation; using defaults. ${issues.join("; ")}`);
    return DEFAULT_CRITERIA;
  }
  return result.data;
}

function readCriteria(): Criteria {
  const storage = getStorage();
  if (!storage) return DEFAULT_CRITERIA;
  try {
    return parseStoredCriteria(storage.getItem(CRITERIA_STORAGE_KEY));
  } catch (error) {
    console.warn(`${LOG_PREFIX} could not read stored criteria; using defaults. ${errorMessage(error)}`);
    return DEFAULT_CRITERIA;
  }
}

function writeCriteria(json: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(CRITERIA_STORAGE_KEY, json);
  } catch (error) {
    console.warn(`${LOG_PREFIX} could not save criteria; changes stay in memory only. ${errorMessage(error)}`);
  }
}

export interface UseCriteriaResult {
  criteria: Criteria;
  setCriteria: (next: SetStateAction<Criteria>) => void;
  resetCriteria: () => void;
  /** False until stored criteria have been read on the client. */
  isLoaded: boolean;
}

export function useCriteria(): UseCriteriaResult {
  const [criteria, setCriteriaState] = useState<Criteria>(DEFAULT_CRITERIA);
  const [isLoaded, setIsLoaded] = useState(false);
  // The value loaded from storage; it is already persisted, so it is not written back.
  const loadedRef = useRef<Criteria | null>(null);
  const pendingJsonRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read once on mount. localStorage is browser-only, so it is touched here
  // and never during render (SPEC §6: SSR guard).
  useEffect(() => {
    const stored = readCriteria();
    loadedRef.current = stored;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SPEC §6 requires reading localStorage in useEffect for SSR safety; this runs once on mount.
    setCriteriaState(stored);
    setIsLoaded(true);
  }, []);

  // Debounced write on change.
  useEffect(() => {
    if (!isLoaded || criteria === loadedRef.current) return;
    // After the first real change every later value is written, including a
    // reset back to the loaded value.
    loadedRef.current = null;
    pendingJsonRef.current = JSON.stringify(criteria);
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const json = pendingJsonRef.current;
      pendingJsonRef.current = null;
      if (json !== null) writeCriteria(json);
    }, CRITERIA_WRITE_DEBOUNCE_MS);
  }, [criteria, isLoaded]);

  // Flush a pending write on unmount.
  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      const json = pendingJsonRef.current;
      pendingJsonRef.current = null;
      if (json !== null) writeCriteria(json);
    },
    [],
  );

  const setCriteria = useCallback((next: SetStateAction<Criteria>) => {
    setCriteriaState(next);
  }, []);

  const resetCriteria = useCallback(() => {
    setCriteriaState(DEFAULT_CRITERIA);
  }, []);

  return { criteria, setCriteria, resetCriteria, isLoaded };
}
