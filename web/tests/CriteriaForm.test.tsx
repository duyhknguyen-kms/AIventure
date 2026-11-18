// @vitest-environment jsdom
import { act, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CriteriaForm } from "@/components/CriteriaForm";
import { DEFAULT_CRITERIA } from "@/lib/matching/criteria";
import type { Criteria } from "@/lib/matching/criteria";
import { renderWithTheme } from "./helpers/ui";

function renderForm(criteria: Criteria = DEFAULT_CRITERIA, onChange = vi.fn()) {
  renderWithTheme(<CriteriaForm criteria={criteria} onChange={onChange} />);
  return { onChange };
}

describe("CriteriaForm", () => {
  it("renders with default criteria without errors", () => {
    renderForm();
    expect(screen.getByRole("form", { name: "Criteria" })).toBeInTheDocument();
    expect(screen.getByTestId("criteria-form")).toBeInTheDocument();
  });

  it("renders all major form sections", () => {
    renderForm();
    // FormSection titles (Typography variant="overline", text-transform via CSS; DOM text is as-is)
    expect(screen.getByText("Skills & Keywords")).toBeInTheDocument();
    expect(screen.getByText("Role")).toBeInTheDocument();
    expect(screen.getByText("Salary")).toBeInTheDocument();
    expect(screen.getByText("Location & Timezone")).toBeInTheDocument();
    expect(screen.getByText("Benefits")).toBeInTheDocument();
  });

  it("adds a keyword by pressing Enter in the keywords input", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithTheme(<CriteriaForm criteria={DEFAULT_CRITERIA} onChange={onChange} />);

    const input = screen.getByLabelText(/Skills \/ keywords/i);
    await user.type(input, "react{Enter}");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ keywords: ["react"] }));
  });

  it("changes min salary and calls onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithTheme(<CriteriaForm criteria={DEFAULT_CRITERIA} onChange={onChange} />);

    const salaryInput = screen.getByTestId("cf-salary-amount");
    await user.clear(salaryInput);
    await user.type(salaryInput, "100000");
    expect(onChange).toHaveBeenCalled();
  });

  it("renders must-have benefit checkboxes with correct aria-label", () => {
    renderForm();
    expect(screen.getByTestId("cf-must-have-group")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Must-have" })).toBeInTheDocument();
  });

  it("renders nice-to-have benefit checkboxes", () => {
    renderForm();
    expect(screen.getByRole("group", { name: "Nice-to-have" })).toBeInTheDocument();
  });

  it("checks a must-have benefit and calls onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithTheme(<CriteriaForm criteria={DEFAULT_CRITERIA} onChange={onChange} />);

    const checkbox = screen.getByTestId("cf-must-have-health");
    await user.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ mustHaveBenefits: ["health"] })
    );
  });

  it("opens reset confirmation dialog when Reset button is clicked", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByTestId("cf-reset-button"));
    expect(screen.getByTestId("cf-reset-dialog")).toBeInTheDocument();
    expect(screen.getByText("Reset all criteria?")).toBeInTheDocument();
  });

  it("calls onChange with DEFAULT_CRITERIA when reset is confirmed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithTheme(
      <CriteriaForm
        criteria={{ ...DEFAULT_CRITERIA, keywords: ["react"] }}
        onChange={onChange}
      />
    );

    await user.click(screen.getByTestId("cf-reset-button"));
    await user.click(screen.getByTestId("cf-reset-confirm"));
    expect(onChange).toHaveBeenCalledWith(DEFAULT_CRITERIA);
  });

  it("cancels reset dialog without calling onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithTheme(<CriteriaForm criteria={DEFAULT_CRITERIA} onChange={onChange} />);

    await user.click(screen.getByTestId("cf-reset-button"));
    // Dialog should be open
    expect(screen.getByTestId("cf-reset-dialog")).toBeInTheDocument();
    await user.click(screen.getByTestId("cf-reset-cancel"));
    // After cancel, onChange should not have been called
    // (it may have been called earlier if interactions triggered it, but not for reset)
    const resetCalls = onChange.mock.calls.filter((call) =>
      JSON.stringify(call[0]) === JSON.stringify(DEFAULT_CRITERIA)
    );
    expect(resetCalls).toHaveLength(0);
  });
});
