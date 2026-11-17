/**
 * §13 — axe accessibility test helper.
 * Renders inside the real ThemeProvider and runs WCAG 2.x AA rules.
 * colour-contrast is disabled in jsdom (no layout engine).
 */
import axe from "axe-core";

export async function runAxe(container: HTMLElement) {
  const results = await axe.run(container, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
    },
    rules: {
      // jsdom has no layout engine — contrast is verified in a real browser
      "color-contrast": { enabled: false },
    },
  });
  return results.violations;
}
