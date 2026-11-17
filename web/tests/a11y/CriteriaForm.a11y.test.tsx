// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "@/theme";
import CriteriaForm from "@/components/CriteriaForm";
import { DEFAULT_CRITERIA } from "@/lib/matching/criteria";
import { runAxe } from "./axe";

function renderForm() {
  const onChange = vi.fn();
  const { container } = render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CriteriaForm criteria={DEFAULT_CRITERIA} onChange={onChange} />
    </ThemeProvider>,
  );
  return { container, onChange };
}

// ── Axe (zero violations) ──────────────────────────────────────────────────

describe("CriteriaForm a11y", () => {
  it("has zero axe violations", async () => {
    const { container } = renderForm();
    const violations = await runAxe(container);
    expect(violations).toEqual([]);
  });
});

// ── Labels ─────────────────────────────────────────────────────────────────

describe("CriteriaForm labels", () => {
  it("Skills input is findable by label", () => {
    renderForm();
    expect(screen.getByLabelText(/skills/i)).toBeTruthy();
  });

  it("Target job titles input is findable by label", () => {
    renderForm();
    expect(screen.getByLabelText(/target job titles/i)).toBeTruthy();
  });

  it("Excluded keywords input is findable by label", () => {
    renderForm();
    expect(screen.getByLabelText(/excluded keywords/i)).toBeTruthy();
  });

  it("Min salary input is findable by label", () => {
    renderForm();
    expect(screen.getByLabelText(/min salary/i)).toBeTruthy();
  });

  it("Country input is findable by label", () => {
    renderForm();
    expect(screen.getByLabelText(/your country/i)).toBeTruthy();
  });
});

// ── Benefit fieldsets use group + legend ───────────────────────────────────

describe("CriteriaForm benefit fieldsets", () => {
  it("Must-have benefits group has an accessible name (legend)", () => {
    renderForm();
    const group = screen.getByRole("group", { name: /must-have benefits/i });
    expect(group).toBeTruthy();
  });

  it("Nice-to-have benefits group has an accessible name (legend)", () => {
    renderForm();
    const group = screen.getByRole("group", { name: /nice-to-have benefits/i });
    expect(group).toBeTruthy();
  });

  it("Seniority group has an accessible name (legend)", () => {
    renderForm();
    const group = screen.getByRole("group", { name: /seniority/i });
    expect(group).toBeTruthy();
  });

  it("Employment type group has an accessible name (legend)", () => {
    renderForm();
    const group = screen.getByRole("group", { name: /employment type/i });
    expect(group).toBeTruthy();
  });
});

// ── Reset button ───────────────────────────────────────────────────────────

describe("CriteriaForm reset", () => {
  it("Reset button is in the document", () => {
    renderForm();
    expect(screen.getByRole("button", { name: /reset criteria/i })).toBeTruthy();
  });
});
