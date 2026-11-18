// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { JobCard } from "@/components/JobCard";
import { makeJob, makeMatch, renderWithTheme } from "../helpers/ui";
import { runAxe } from "./axe";

describe("JobCard accessibility (SPEC §13, NFR3)", () => {
  it("renders with zero axe violations and is named by title and company", async () => {
    const job = makeJob();
    const { container } = renderWithTheme(<JobCard job={job} match={makeMatch(job)} mustHave={["health"]} />);

    expect(await runAxe(container)).toEqual([]);
    const card = screen.getByRole("article");
    expect(card).toHaveAccessibleName(/Senior Frontend Engineer/);
    expect(card).toHaveAccessibleName(/Acme/);
    expect(screen.getByRole("heading", { level: 3, name: "Senior Frontend Engineer" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Acme logo" })).toBeInTheDocument();
  });

  it("shows an initials Avatar when the logo is missing, still with no violations", async () => {
    const job = makeJob({ company: "Blue Harbor Labs", companyLogo: null });
    const { container } = renderWithTheme(<JobCard job={job} match={makeMatch(job)} />);

    expect(screen.getByTestId("job-card-initials")).toHaveTextContent("BH");
    expect(screen.queryByRole("img", { name: /logo/ })).not.toBeInTheDocument();
    expect(await runAxe(container)).toEqual([]);
  });

  it("match badge text includes the number and the level word, not only colour", () => {
    const job = makeJob();
    renderWithTheme(<JobCard job={job} match={makeMatch(job, { matchPercent: 88 })} />);
    expect(screen.getByTestId("job-card-match-badge")).toHaveTextContent("88% · Strong match");
  });

  it.each([
    [75, "75% · Strong match"],
    [74, "74% · Medium match"],
    [50, "50% · Medium match"],
    [49, "49% · Low match"],
  ])("labels %i%% as %s", (percent, label) => {
    const job = makeJob();
    renderWithTheme(<JobCard job={job} match={makeMatch(job, { matchPercent: percent })} />);
    expect(screen.getByTestId("job-card-match-badge")).toHaveTextContent(label);
  });

  it("shows salary, employment type, location note and source credit", () => {
    const job = makeJob({
      salary: null,
      employmentType: "contract",
      source: "remotive",
      sourceUrl: "https://remotive.com/remote-jobs/software-dev/frontend-1",
      location: { worldwide: false, countries: [], regions: [], raw: "Somewhere nice" },
      alsoOn: [{ source: "himalayas", url: "https://himalayas.app/companies/acme/jobs/x" }],
    });
    renderWithTheme(<JobCard job={job} match={makeMatch(job, { locationUncertain: true })} />);

    expect(screen.getByTestId("job-card-salary")).toHaveTextContent("Salary not listed");
    expect(screen.getByTestId("job-card-employment")).toHaveTextContent("Contract");
    expect(screen.getByTestId("job-card-location")).toHaveTextContent("Somewhere nice (location uncertain");
    const credit = screen.getByTestId("source-attribution");
    expect(credit).toHaveTextContent("Source: Remotive");
    expect(within(credit).getByRole("link", { name: "View Senior Frontend Engineer on Remotive (opens in new tab)" }))
      .toHaveAttribute("href", "https://remotive.com/remote-jobs/software-dev/frontend-1");
    expect(within(credit).getByRole("link", { name: "View Senior Frontend Engineer on Himalayas (opens in new tab)" }))
      .toHaveAttribute("target", "_blank");
  });

  it("calls onSelect from the card action by keyboard, with no violations", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const job = makeJob();
    const { container } = renderWithTheme(<JobCard job={job} match={makeMatch(job)} onSelect={onSelect} />);

    const action = screen.getByRole("button", { name: "Senior Frontend Engineer" });
    action.focus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith(job);
    expect(screen.getByRole("heading", { level: 3 })).toContainElement(action);
    expect(await runAxe(container)).toEqual([]);
  });

  it("renders no action button without onSelect", () => {
    const job = makeJob();
    renderWithTheme(<JobCard job={job} match={makeMatch(job)} />);
    expect(screen.queryByTestId("job-card-action")).not.toBeInTheDocument();
  });
});
