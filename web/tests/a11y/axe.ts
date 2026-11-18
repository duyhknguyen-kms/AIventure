import axe from "axe-core";

/** axe-core with the WCAG 2.x A/AA tags (SPEC §13). Render inside the real ThemeProvider first. */
export async function runAxe(container: HTMLElement) {
  const results = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
    rules: { "color-contrast": { enabled: false } }, // jsdom has no layout; contrast is checked in the browser (§10.5)
  });
  return results.violations;
}
// in tests: expect(await runAxe(container)).toEqual([]);
