/* Pure clinical display helpers (no React). Unit-tested in clinical.test.ts. */

export type Severity = 'mild' | 'moderate' | 'severe';

/** Bands from §8 A1: Mild 0–3 · Moderate 4–6 · Severe 7–10. */
export function severityOf(score: number): Severity {
  if (score < 4) return 'mild';
  if (score < 7) return 'moderate';
  return 'severe';
}

export const severityBg: Record<Severity, string> = {
  mild: 'bg-pain-mild',
  moderate: 'bg-pain-moderate',
  severe: 'bg-pain-severe',
};

/** HC pattern per severity (A8 sheet 4): mild = dots, moderate = stripes, severe = solid. */
export const severityPattern: Record<Severity, string> = {
  mild: 'pat-dots',
  moderate: 'pat-stripes',
  severe: 'bg-ink',
};


export type ArousalLevel = 'LOW' | 'MODERATE' | 'HIGH';

/** D-4: LOW < 1.0 ≤ MODERATE < 2.0 ≤ HIGH (expert priors, configurable later). */
export function arousalLevelOf(z: number): ArousalLevel {
  if (z < 1) return 'LOW';
  if (z < 2) return 'MODERATE';
  return 'HIGH';
}


export type Channel = 'ppg' | 'eda' | 'temp' | 'motion';

/** Deterministic illustrative waveform (component sheet only; live data arrives in Phase 4). */
export function syntheticPath(channel: Channel, w: number, h: number, seed = 1, noisy = false): string {
  let s = seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const pts: string[] = [];
  const n = 120;
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * w;
    let y: number;
    if (channel === 'ppg') {
      const ph = (i % 12) / 12;
      const beat = ph < 0.25 ? Math.sin((ph / 0.25) * Math.PI) : ph < 0.45 ? 0.35 * Math.sin(((ph - 0.25) / 0.2) * Math.PI) : 0;
      y = h * 0.8 - beat * h * 0.65 + (noisy ? (rnd() - 0.5) * h * 0.6 : 0);
    } else if (channel === 'eda') {
      y = h * 0.7 - (i / n) * h * 0.25 - Math.max(0, Math.sin(i / 7)) * h * 0.12 + (noisy ? (rnd() - 0.5) * h * 0.4 : 0);
    } else if (channel === 'temp') {
      y = h * 0.5 + Math.sin(i / 30) * h * 0.04;
    } else {
      y = h * 0.55 + (rnd() - 0.5) * h * (noisy ? 0.9 : 0.15);
    }
    pts.push(`${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

