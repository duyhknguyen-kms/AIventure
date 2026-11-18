/**
 * Converts job-description HTML to plain text for matching and benefit
 * detection (SPEC §8, FR2, FR8.1). The output is never rendered as HTML.
 *
 * Rules:
 * - `<br>`, `</p>` and `</li>` become line breaks; every other tag is removed.
 * - Common named entities (`&amp; &lt; &gt; &quot; &#39; &apos; &nbsp;`) and
 *   numeric entities (`&#NNN;`, `&#xHH;`) are decoded in a single pass, so
 *   `&amp;lt;` decodes to the literal text `&lt;`, not to `<`.
 * - Runs of spaces and tabs collapse to one space, each line is trimmed, and
 *   blank lines are dropped.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

const LINE_BREAK_TAG = /<br\s*\/?>|<\/p\s*>|<\/li\s*>/gi;
const ANY_TAG = /<\/?[a-z!][^>]*>/gi;
const ENTITY = /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi;
const MAX_CODE_POINT = 0x10ffff;

function decodeEntity(match: string, body: string): string {
  const lower = body.toLowerCase();
  if (lower.startsWith("#")) {
    const codePoint = lower.startsWith("#x")
      ? Number.parseInt(lower.slice(2), 16)
      : Number.parseInt(lower.slice(1), 10);
    if (!Number.isFinite(codePoint) || codePoint <= 0 || codePoint > MAX_CODE_POINT) {
      return match; // not a valid character reference; keep the original text
    }
    return String.fromCodePoint(codePoint);
  }
  return NAMED_ENTITIES[lower] ?? match;
}

export function stripHtml(html: string): string {
  if (typeof html !== "string" || html.length === 0) return "";

  const text = html
    .replace(LINE_BREAK_TAG, "\n")
    .replace(ANY_TAG, "")
    .replace(ENTITY, decodeEntity);

  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/[\s\u00a0]+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}
