import { arousalLevelOf, severityOf, syntheticPath } from './clinical';

describe('severityOf (§8 A1 bands: mild 0–3, moderate 4–6, severe 7–10)', () => {
  it.each([
    [0, 'mild'],
    [3.9, 'mild'],
    [4, 'moderate'],
    [6.4, 'moderate'],
    [6.99, 'moderate'],
    [7, 'severe'],
    [10, 'severe'],
  ] as const)('%s → %s', (score, sev) => {
    expect(severityOf(score)).toBe(sev);
  });
});

describe('arousalLevelOf (D-4: only LOW / MODERATE / HIGH)', () => {
  it.each([
    [0.4, 'LOW'],
    [0.99, 'LOW'],
    [1, 'MODERATE'],
    [1.9, 'MODERATE'],
    [2, 'HIGH'],
    [2.6, 'HIGH'],
  ] as const)('z %s → %s', (z, level) => {
    expect(arousalLevelOf(z)).toBe(level);
  });
  it('never returns any other level (no "Elevated")', () => {
    const levels = new Set([-1, 0, 0.5, 1, 1.5, 2, 3, 5].map(arousalLevelOf));
    expect([...levels].sort()).toEqual(['HIGH', 'LOW', 'MODERATE']);
  });
});

describe('syntheticPath', () => {
  it('is deterministic for a given seed', () => {
    expect(syntheticPath('ppg', 190, 30, 3, true)).toBe(syntheticPath('ppg', 190, 30, 3, true));
  });
  it('stays inside the drawing box for clean signals', () => {
    const ys = syntheticPath('eda', 190, 30, 1)
      .split(/[ML]/)
      .filter(Boolean)
      .map((p) => Number(p.trim().split(' ')[1]));
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(30);
  });
});
