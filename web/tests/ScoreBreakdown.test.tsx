// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import type { MatchResult } from "@/lib/types";
import { renderWithTheme } from "./helpers/ui";
import { makeJob } from "./helpers/jobs";
import { rankJobs } from "@/lib/matching/score";
import { DEFAULT_CRITERIA } from "@/lib/matching/criteria";

function makeMatch(overrides?: Partial<MatchResult>): MatchResult {
  const { ranked } = rankJobs([makeJob()], DEFAULT_CRITERIA);
  return { ...ranked[0].match, ...overrides };
}

describe("ScoreBreakdown", () => {
  it("renders a table with match score breakdown caption", () => {
    const match = makeMatch({ matchPercent: 100 });
    renderWithTheme(<ScoreBreakdown match={match} />);
    // Caption is visually hidden but present in DOM
    expect(document.querySelector("caption")).toHaveTextContent("Match score breakdown");
  });

  it("shows the total match percent", () => {
    const match = makeMatch({ matchPercent: 72 });
    renderWithTheme(<ScoreBreakdown match={match} />);
    // The large heading shows "72%" (may appear in footer row too)
    const percentTexts = document.querySelectorAll("*");
    const count = Array.from(percentTexts).filter((el) => el.textContent === "72%").length;
    expect(count).toBeGreaterThan(0);
    expect(screen.getByText("Medium match")).toBeInTheDocument();
  });

  it("shows Strong match for >= 75%", () => {
    renderWithTheme(<ScoreBreakdown match={makeMatch({ matchPercent: 88 })} />);
    expect(screen.getByText("Strong match")).toBeInTheDocument();
  });

  it("shows Low match for < 50%", () => {
    renderWithTheme(<ScoreBreakdown match={makeMatch({ matchPercent: 30 })} />);
    expect(screen.getByText("Low match")).toBeInTheDocument();
  });

  it("shows 'Not set in your criteria' for inactive factors", () => {
    const { ranked } = rankJobs([makeJob()], DEFAULT_CRITERIA);
    renderWithTheme(<ScoreBreakdown match={ranked[0].match} />);
    // All factors are inactive with default criteria
    const cells = screen.getAllByText("Not set in your criteria");
    expect(cells.length).toBeGreaterThan(0);
  });

  it("renders progress bars with aria attributes for active factors", () => {
    const match = makeMatch({
      factors: [
        { key: "skills", weight: 30, active: true, score: 0.75, points: 22.5, detail: "3/4 skills matched" },
        { key: "title", weight: 20, active: false, score: 0, points: 0, detail: "" },
      ],
    });
    renderWithTheme(<ScoreBreakdown match={match} />);
    const progressBar = screen.getByRole("progressbar", { name: "Skills" });
    expect(progressBar).toHaveAttribute("aria-valuenow", "75");
  });
});
