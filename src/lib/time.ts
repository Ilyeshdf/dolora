/**
 * Time formatting. Fixtures use a fixed reference day and UTC formatting so screenshots are
 * deterministic; Phase 4 switches the clock source to device-local time (D-24) through `fmtTime`.
 */
export function fmtTime(t: number, withSeconds = true): string {
  const d = new Date(t);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return withSeconds ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
}

/** m:ss for countdown chips. */
export function fmtCountdown(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Age of a value for freshness tags: "45 s", "12 min", "3 h 40 min" (unit words come from i18n). */
export function ageParts(ms: number): { h: number; m: number; s: number } {
  const total = Math.max(0, Math.round(ms / 1000));
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}
