/**
 * §4.5 — UTC offset parsing
 *
 * Real Himalayas API returns timezoneRestrictions as numbers (e.g. -10, 5.5).
 * This function also handles string forms ("-5", "+7", "UTC-05:00", "GMT+5:30")
 * for forward-compatibility and Remotive usage.
 */
export function parseUtcOffset(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;

  // Already a number
  if (typeof value === "number") {
    return isFinite(value) && value >= -12 && value <= 14 ? value : null;
  }

  const s = String(value).trim();
  if (!s) return null;

  // Strip UTC/GMT prefix: "UTC-05:00", "GMT+5:30"
  const stripped = s.replace(/^(utc|gmt)/i, "").trim();

  // Match optional sign + hours + optional :minutes
  const match = stripped.match(/^([+-]?)(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return null;

  const sign = match[1] === "-" ? -1 : 1;
  const hours = parseInt(match[2], 10);
  const minutes = match[3] ? parseInt(match[3], 10) / 60 : 0;
  const offset = sign * (hours + minutes);

  if (offset < -12 || offset > 14) return null;
  return offset;
}
