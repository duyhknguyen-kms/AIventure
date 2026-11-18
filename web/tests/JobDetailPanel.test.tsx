// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { JobDetailPanel } from "@/components/JobDetailPanel";
import { DEFAULT_CRITERIA } from "@/lib/matching/criteria";
import { rankJobs } from "@/lib/matching/score";
import { renderWithTheme } from "./helpers/ui";
import { makeJob } from "./helpers/jobs";

function setup(onClose = vi.fn()) {
  const job = makeJob({ title: "Senior React Engineer", company: "Acme Corp" });
  const { ranked } = rankJobs([job], DEFAULT_CRITERIA);
  const rankedJob = ranked[0];
  renderWithTheme(<JobDetailPanel job={rankedJob} match={rankedJob.match} onClose={onClose} />);
  return { job: rankedJob, onClose };
}

describe("JobDetailPanel", () => {
  it("renders the job title and company", () => {
    setup();
    expect(screen.getByText("Senior React Engineer")).toBeInTheDocument();
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
  });

  it("renders the Apply button linking to applyUrl in a new tab", () => {
    setup();
    const buttons = screen.getAllByTestId("detail-apply-button");
    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons[0]).toHaveAttribute("target", "_blank");
    expect(buttons[0].getAttribute("aria-label")).toContain("opens in new tab");
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const { onClose } = setup();
    await user.click(screen.getByTestId("detail-close-button"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders null when job is null", () => {
    renderWithTheme(
      <JobDetailPanel job={null} match={null} onClose={() => {}} />
    );
    expect(screen.queryByTestId("detail-panel")).not.toBeInTheDocument();
  });

  it("renders the match score breakdown", () => {
    setup();
    expect(document.querySelector("caption")).toHaveTextContent("Match score breakdown");
  });

  it("renders the job description as plain text (not HTML)", () => {
    const job = makeJob({ descriptionText: "We are looking for a React developer." });
    const { ranked } = rankJobs([job], DEFAULT_CRITERIA);
    renderWithTheme(<JobDetailPanel job={ranked[0]} match={ranked[0].match} onClose={() => {}} />);
    expect(screen.getByTestId("detail-description")).toHaveTextContent("We are looking for a React developer.");
  });
});
