// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { JobDetailPanel } from "@/components/JobDetailPanel";
import { DEFAULT_CRITERIA } from "@/lib/matching/criteria";
import { rankJobs } from "@/lib/matching/score";
import { renderWithTheme } from "../helpers/ui";
import { makeJob } from "../helpers/jobs";
import { runAxe } from "./axe";

describe("JobDetailPanel accessibility (SPEC §13, NFR3)", () => {
  it("has zero axe violations when open", async () => {
    const job = makeJob({ title: "Senior React Engineer" });
    const { ranked } = rankJobs([job], DEFAULT_CRITERIA);
    const { container } = renderWithTheme(
      <JobDetailPanel job={ranked[0]} match={ranked[0].match} onClose={() => {}} />
    );
    expect(await runAxe(container)).toEqual([]);
  });

  it("Apply link accessible name contains '(opens in new tab)'", () => {
    const job = makeJob({ title: "Senior React Engineer" });
    const { ranked } = rankJobs([job], DEFAULT_CRITERIA);
    renderWithTheme(<JobDetailPanel job={ranked[0]} match={ranked[0].match} onClose={() => {}} />);
    const applyButtons = screen.getAllByTestId("detail-apply-button");
    expect(applyButtons[0].getAttribute("aria-label")).toContain("opens in new tab");
  });

  it("close button calls onClose and returns focus", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const job = makeJob();
    const { ranked } = rankJobs([job], DEFAULT_CRITERIA);
    renderWithTheme(<JobDetailPanel job={ranked[0]} match={ranked[0].match} onClose={onClose} />);
    await user.click(screen.getByTestId("detail-close-button"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
