// @vitest-environment jsdom
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BenefitChips, benefitChipEntries } from "@/components/BenefitChips";
import { LiveAnnouncer } from "@/components/LiveAnnouncer";
import { SkipLink } from "@/components/SkipLink";
import { SourceAttribution } from "@/components/SourceAttribution";
import { REMOTIVE_DELAY_NOTE, SourceStatusBanner, hasSourceProblem } from "@/components/SourceStatusBanner";
import type { DetectedBenefit } from "@/lib/types";
import { runAxe } from "./a11y/axe";
import { makeSources, renderWithTheme } from "./helpers/ui";

const health: DetectedBenefit = { key: "health", label: "Health / Medical", evidence: ["health insurance"] };
const learning: DetectedBenefit = { key: "learning", label: "Learning budget", evidence: ["learning budget"] };

describe("SkipLink (Step 25)", () => {
  it("links to #main with the SPEC label", () => {
    renderWithTheme(<SkipLink />);
    const link = screen.getByRole("link", { name: "Skip to job results" });
    expect(link).toHaveAttribute("href", "#main");
  });
});

describe("LiveAnnouncer (Step 26)", () => {
  it("is a polite status region that announces only the last message after 500 ms", () => {
    vi.useFakeTimers();
    try {
      const { rerender } = renderWithTheme(<LiveAnnouncer message="Loading jobs" />);
      const region = screen.getByRole("status");
      expect(region).toHaveAttribute("aria-live", "polite");
      expect(region).toBeEmptyDOMElement();

      act(() => vi.advanceTimersByTime(300));
      rerender(<LiveAnnouncer message="Showing 3 jobs, sorted by match" />);
      act(() => vi.advanceTimersByTime(499));
      expect(region).toBeEmptyDOMElement();
      act(() => vi.advanceTimersByTime(1));
      expect(region).toHaveTextContent("Showing 3 jobs, sorted by match");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("SourceAttribution (Step 27)", () => {
  it("credits the source with a new-tab link named after the job", () => {
    renderWithTheme(
      <SourceAttribution source="himalayas" sourceUrl="https://himalayas.app/jobs/1" alsoOn={[]} jobTitle="Data Analyst" />,
    );
    expect(screen.getByTestId("source-attribution")).toHaveTextContent("Source: Himalayas");
    const link = screen.getByRole("link", { name: "View Data Analyst on Himalayas (opens in new tab)" });
    expect(link).toHaveAttribute("href", "https://himalayas.app/jobs/1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("lists alsoOn sources and ignores an entry for the primary source", () => {
    renderWithTheme(
      <SourceAttribution
        source="himalayas"
        sourceUrl="https://himalayas.app/jobs/1"
        alsoOn={[
          { source: "remotive", url: "https://remotive.com/remote-jobs/1" },
          { source: "himalayas", url: "https://himalayas.app/jobs/dup" },
        ]}
        jobTitle="Data Analyst"
      />,
    );
    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "View Data Analyst on Remotive (opens in new tab)" })).toHaveAttribute(
      "href",
      "https://remotive.com/remote-jobs/1",
    );
  });
});

describe("SourceStatusBanner (Step 28)", () => {
  it("renders nothing when every source is healthy", () => {
    const { container } = renderWithTheme(<SourceStatusBanner sources={makeSources()} onRetry={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("names the failed source and its error, notes the Remotive delay, and retries", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { container } = renderWithTheme(
      <SourceStatusBanner sources={makeSources({ remotive: { ok: false, error: "HTTP 429" } })} onRetry={onRetry} />,
    );
    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("Remotive unavailable – showing Himalayas only")).toBeInTheDocument();
    expect(alert).toHaveTextContent("Remotive unavailable: HTTP 429");
    expect(alert).toHaveTextContent(REMOTIVE_DELAY_NOTE);
    await user.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(await runAxe(container)).toEqual([]);
  });

  it("flags a source served from the cache after a failed refresh", () => {
    const sources = makeSources({ himalayas: { cached: true, error: "HTTP 500" } });
    expect(hasSourceProblem(sources[0])).toBe(true);
    renderWithTheme(<SourceStatusBanner sources={sources} onRetry={() => {}} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Some results may be out of date");
    expect(screen.getByRole("alert")).toHaveTextContent("Himalayas: showing saved results");
  });

  it("shows a total failure as an error even without per-source details", () => {
    renderWithTheme(<SourceStatusBanner variant="total" sources={[]} error="Internal server error" onRetry={() => {}} />);
    expect(screen.getByTestId("source-status-total-failure")).toHaveTextContent("Job sources are unavailable");
    expect(screen.getByTestId("source-status-total-failure")).toHaveTextContent("Internal server error");
  });
});

describe("BenefitChips (Step 31)", () => {
  it("orders must-have, missing, then other benefits", () => {
    expect(benefitChipEntries([learning, health], ["health", "pto"]).map((e) => `${e.kind}:${e.key}`)).toEqual([
      "must-have:health",
      "missing:pto",
      "detected:learning",
    ]);
  });

  it("marks must-have and missing chips with text and an icon, not colour alone", async () => {
    const { container } = renderWithTheme(<BenefitChips benefits={[health, learning]} mustHave={["health", "pto"]} />);
    const mustHave = screen.getByTestId("benefit-chip-must-have");
    expect(mustHave).toHaveTextContent("Health / Medical · must-have");
    expect(mustHave).toHaveClass("MuiChip-filled");
    expect(mustHave.querySelector("svg")).not.toBeNull();
    const missing = screen.getByTestId("benefit-chip-missing");
    expect(missing).toHaveTextContent("Paid time off · missing");
    expect(missing).toHaveClass("MuiChip-outlined");
    expect(missing.querySelector("svg")).not.toBeNull();
    expect(screen.getByTestId("benefit-chip")).toHaveTextContent("Learning budget");
    expect(await runAxe(container)).toEqual([]);
  });

  it("says when no benefits were detected", () => {
    renderWithTheme(<BenefitChips benefits={[]} />);
    expect(screen.getByTestId("benefit-chips-empty")).toHaveTextContent("No benefits detected");
  });

  it("collapses chips beyond maxVisible behind a toggle that keeps focus", async () => {
    const user = userEvent.setup();
    renderWithTheme(<BenefitChips benefits={[health, learning]} mustHave={["pto"]} maxVisible={1} />);
    expect(within(screen.getByTestId("benefit-chips")).getAllByRole("listitem")).toHaveLength(1);
    const toggle = screen.getByRole("button", { name: "Show 2 more" });
    await user.click(toggle);
    expect(within(screen.getByTestId("benefit-chips")).getAllByRole("listitem")).toHaveLength(3);
    expect(toggle).toHaveTextContent("Show fewer");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });
});
