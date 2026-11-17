/**
 * §8 — stripHtml
 * Converts HTML to plain text suitable for matching and display.
 * Never used for rendering; output is always treated as text.
 */
export function stripHtml(html: string): string {
  if (!html) return "";

  return html
    // Block-level line breaks before stripping tags
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    // Remove all remaining tags
    .replace(/<[^>]*>/g, "")
    // Decode named entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    // Decode numeric entities &#NNN; and &#xHH;
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    // Collapse whitespace (keep single newlines for readability)
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
