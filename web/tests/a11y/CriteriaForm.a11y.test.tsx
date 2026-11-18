// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { CriteriaForm } from "@/components/CriteriaForm";
import { DEFAULT_CRITERIA } from "@/lib/matching/criteria";
import { renderWithTheme } from "../helpers/ui";
import { runAxe } from "./axe";

describe("CriteriaForm accessibility (SPEC §13, NFR3)", () => {
  it("has zero axe violations with default criteria", async () => {
    const { container } = renderWithTheme(
      <CriteriaForm criteria={DEFAULT_CRITERIA} onChange={() => {}} />
    );
    expect(await runAxe(container)).toEqual([]);
  });

  it("renders must-have benefit group with a legend", () => {
    const { container } = renderWithTheme(
      <CriteriaForm criteria={DEFAULT_CRITERIA} onChange={() => {}} />
    );
    const groups = container.querySelectorAll("fieldset");
    // At least two fieldsets for must-have and nice-to-have
    expect(groups.length).toBeGreaterThanOrEqual(2);
    const legends = Array.from(groups).map((f) => f.querySelector("legend")?.textContent?.trim());
    expect(legends).toContain("Must-have");
    expect(legends).toContain("Nice-to-have");
  });
});
