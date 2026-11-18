/**
 * Parses a UTC offset string to hours (SPEC §4.5).
 *
 * Accepts an optional `UTC` / `GMT` prefix, an optional sign (`+`, `-` or the
 * Unicode minus `−`), hours, and optional minutes with or without a colon:
 * `"-5"`, `"+7"`, `"UTC-05:00"`, `"GMT+5:30"`, `"UTC+0530"`, `"UTC"` (0).
 * Returns `null` for anything else, or when the offset is outside the real
 * range of -12..+14 hours. Callers drop `null` values.
 *
 * TODO(SPEC §4.5): verify against the real Himalayas `timezoneRestrictions`
 * format once the first fixture is recorded (Step 19) and extend if needed.
 */

const OFFSET_PATTERN = /^(?:(?:utc|gmt)\s*)?(?:([+\-\u2212])\s*)?(\d{1,2})(?::?(\d{2}))?$/i;
const PREFIX_ONLY = /^(?:utc|gmt)$/i;
const MIN_OFFSET = -12;
const MAX_OFFSET = 14;

export function parseUtcOffset(s: string | null | undefined): number | null {
  if (typeof s !== "string") return null;
  const input = s.trim();
  if (input.length === 0) return null;
  if (PREFIX_ONLY.test(input)) return 0;

  const match = OFFSET_PATTERN.exec(input);
  if (!match) return null;

  const [, sign, hoursText, minutesText] = match;
  const hours = Number(hoursText);
  const minutes = minutesText === undefined ? 0 : Number(minutesText);
  if (minutes >= 60) return null;

  const magnitude = hours + minutes / 60;
  const offset = sign === "-" || sign === "\u2212" ? -magnitude : magnitude;
  if (offset < MIN_OFFSET || offset > MAX_OFFSET) return null;
  return offset === 0 ? 0 : offset; // avoid -0
}
