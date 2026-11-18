// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CRITERIA_WRITE_DEBOUNCE_MS,
  parseStoredCriteria,
  useCriteria,
} from "@/hooks/useCriteria";
import { CRITERIA_STORAGE_KEY, type Criteria, DEFAULT_CRITERIA } from "@/lib/matching/criteria";

function storedCriteria(): Criteria {
  return {
    ...DEFAULT_CRITERIA,
    keywords: ["react", "typescript"],
    seniority: ["senior"],
    minSalary: { amount: 100000, currency: "USD" },
    country: "VN",
    timezoneOffset: 7,
    mustHaveBenefits: ["health"],
  };
}

/**
 * In-memory Storage. Node 22+ ships its own experimental `localStorage`
 * global, which shadows jsdom's and is undefined without
 * `--localstorage-file`, so the tests install this one on `window`.
 */
class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  get length(): number {
    return this.items.size;
  }
  clear(): void {
    this.items.clear();
  }
  getItem(key: string): string | null {
    return this.items.has(key) ? this.items.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.items.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
  setItem(key: string, value: string): void {
    this.items.set(key, String(value));
  }
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true, writable: true });
});

describe("useCriteria (FR5, SPEC §6 persistence)", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("loads valid stored criteria on mount", () => {
    window.localStorage.setItem(CRITERIA_STORAGE_KEY, JSON.stringify(storedCriteria()));
    const { result } = renderHook(() => useCriteria());
    expect(result.current.isLoaded).toBe(true);
    expect(result.current.criteria).toEqual(storedCriteria());
    expect(warn).not.toHaveBeenCalled();
  });

  it("uses DEFAULT_CRITERIA when nothing is stored, without warning or writing", () => {
    const setItem = vi.spyOn(storage, "setItem");
    const { result } = renderHook(() => useCriteria());
    expect(result.current.criteria).toEqual(DEFAULT_CRITERIA);
    act(() => {
      vi.advanceTimersByTime(CRITERIA_WRITE_DEBOUNCE_MS * 2);
    });
    expect(setItem).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("falls back to defaults with a warning on invalid JSON", () => {
    window.localStorage.setItem(CRITERIA_STORAGE_KEY, "{not json");
    const { result } = renderHook(() => useCriteria());
    expect(result.current.criteria).toEqual(DEFAULT_CRITERIA);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("not valid JSON"));
  });

  it("falls back to defaults with a warning on schema-invalid data", () => {
    window.localStorage.setItem(
      CRITERIA_STORAGE_KEY,
      JSON.stringify({ ...storedCriteria(), version: 2, country: "Vietnam" }),
    );
    const { result } = renderHook(() => useCriteria());
    expect(result.current.criteria).toEqual(DEFAULT_CRITERIA);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("failed validation"));
  });

  it("writes the full JSON only after 300 ms of no changes", () => {
    const { result } = renderHook(() => useCriteria());
    const first = { ...DEFAULT_CRITERIA, keywords: ["react"] };
    const second = { ...DEFAULT_CRITERIA, keywords: ["react", "node"] };

    act(() => result.current.setCriteria(first));
    act(() => {
      vi.advanceTimersByTime(CRITERIA_WRITE_DEBOUNCE_MS - 1);
    });
    expect(window.localStorage.getItem(CRITERIA_STORAGE_KEY)).toBeNull();

    act(() => result.current.setCriteria(second)); // restarts the debounce
    act(() => {
      vi.advanceTimersByTime(CRITERIA_WRITE_DEBOUNCE_MS - 1);
    });
    expect(window.localStorage.getItem(CRITERIA_STORAGE_KEY)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(JSON.parse(window.localStorage.getItem(CRITERIA_STORAGE_KEY)!)).toEqual(second);
  });

  it("writes a reset back to the defaults", () => {
    window.localStorage.setItem(CRITERIA_STORAGE_KEY, JSON.stringify(storedCriteria()));
    const { result } = renderHook(() => useCriteria());
    act(() => result.current.resetCriteria());
    act(() => {
      vi.advanceTimersByTime(CRITERIA_WRITE_DEBOUNCE_MS);
    });
    expect(result.current.criteria).toEqual(DEFAULT_CRITERIA);
    expect(JSON.parse(window.localStorage.getItem(CRITERIA_STORAGE_KEY)!)).toEqual(DEFAULT_CRITERIA);
  });

  it("flushes a pending write on unmount", () => {
    const { result, unmount } = renderHook(() => useCriteria());
    const changed = { ...DEFAULT_CRITERIA, country: "DE" };
    act(() => result.current.setCriteria(changed));
    unmount();
    expect(JSON.parse(window.localStorage.getItem(CRITERIA_STORAGE_KEY)!)).toEqual(changed);
  });

  it("keeps working and warns when storage throws (quota exceeded)", () => {
    vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    });
    const { result } = renderHook(() => useCriteria());
    const changed = { ...DEFAULT_CRITERIA, keywords: ["react"] };
    act(() => result.current.setCriteria(changed));
    expect(() =>
      act(() => {
        vi.advanceTimersByTime(CRITERIA_WRITE_DEBOUNCE_MS);
      }),
    ).not.toThrow();
    expect(result.current.criteria).toEqual(changed);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("QuotaExceededError"));
  });

  it("uses defaults and warns when reading storage throws (storage disabled)", () => {
    vi.spyOn(storage, "getItem").mockImplementation(() => {
      throw new DOMException("Access denied.", "SecurityError");
    });
    const { result } = renderHook(() => useCriteria());
    expect(result.current.criteria).toEqual(DEFAULT_CRITERIA);
    expect(result.current.isLoaded).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("SecurityError"));
  });
});

describe("parseStoredCriteria", () => {
  it("returns parsed criteria for valid JSON and defaults for null", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(parseStoredCriteria(JSON.stringify(storedCriteria()))).toEqual(storedCriteria());
    expect(parseStoredCriteria(null)).toBe(DEFAULT_CRITERIA);
    expect(parseStoredCriteria("[]")).toBe(DEFAULT_CRITERIA);
    vi.restoreAllMocks();
  });
});
