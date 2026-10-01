import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * D-6 guard: saturated red (--alert) is reserved for alert semantics — the alert banner, timeline
 * alert markers and the Unit-overview alert badge. Any other use of the alert colour fails here.
 */
const ALLOWED = new Set(
  [
    'components/ui/AlertSlot.tsx', // alert banner
    'components/ui/Badge.tsx', // unit-overview alert badge tone
    'components/ui/Button.tsx', // buttons drawn ON the alert banner (alert-fg / alert-solid-fg)
    'components/clinical/TimelineMarkers.tsx', // timeline alert triangle
  ].map((p) => p.split('/').join(sep)),
);
const RED = /\b(?:bg|text|fill|stroke|border|ring|outline|from|to)-alert(?![-\w])/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f: string) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return files(p);
    return /\.(tsx?|css)$/.test(f) && !/\.test\./.test(f) ? [p] : [];
  });
}

describe('red = alert semantics only (D-6)', () => {
  it('uses the alert colour only in allow-listed alert components', () => {
    const root = join(process.cwd(), 'src');
    const offenders = files(root)
      .filter((f) => !ALLOWED.has(relative(root, f)))
      .filter((f) => RED.test(readFileSync(f, 'utf8')))
      .map((f) => relative(root, f));
    expect(offenders).toEqual([]);
  });

  it('detects a violation (self-check of the pattern)', () => {
    expect(RED.test('className="bg-alert"')).toBe(true);
    expect(RED.test('className="text-alert-fg"')).toBe(false);
    expect(RED.test('className="text-alert-solid-fg"')).toBe(false);
  });
});
