// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "@/components/Dashboard";
import { renderWithTheme } from "../helpers/ui";
import { makeJob, makeSources } from "../helpers/jobs";
import { runAxe } from "./axe";

class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  get length() { return this.items.size; }
  clear() { this.items.clear(); }
  getItem(k: string) { return this.items.get(k) ?? null; }
  key(i: number) { return Array.from(this.items.keys())[i] ?? null; }
  removeItem(k: string) { this.items.delete(k); }
  setItem(k: string, v: string) { this.items.set(k, String(v)); }
}

beforeEach(() => {
  Object.defineProperty(window, "localStorage", { value: new MemoryStorage(), configurable: true, writable: true });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      fetchedAt: "2026-11-17T09:00:00.000Z",
      sources: makeSources({ himalayas: { count: 2 } }),
      jobs: [makeJob({ sourceId: "a", title: "Frontend Engineer" }), makeJob({ sourceId: "b", title: "Backend Engineer" })],
    }),
  }));
});

afterEach(() => { vi.unstubAllGlobals(); });

describe("Dashboard accessibility (SPEC §13, NFR3)", () => {
  it("has zero axe violations after jobs load", async () => {
    const { container } = renderWithTheme(<Dashboard />);
    // Wait for jobs to render
    await screen.findByTestId("job-list-area");
    expect(await runAxe(container)).toEqual([]);
  });

  it("has exactly one h1 landmark", async () => {
    renderWithTheme(<Dashboard />);
    await screen.findByTestId("job-list-area");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("has a main landmark with id=main", async () => {
    renderWithTheme(<Dashboard />);
    await screen.findByTestId("job-list-area");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
  });

  it("skip link is first in tab order", async () => {
    const { container } = renderWithTheme(<Dashboard />);
    await screen.findByTestId("job-list-area");
    const allFocusable = container.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex="0"]'
    );
    expect((allFocusable[0] as HTMLElement).getAttribute("data-testid")).toBe("skip-link");
  });

  it("live region has role=status", async () => {
    renderWithTheme(<Dashboard />);
    await screen.findByTestId("job-list-area");
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
