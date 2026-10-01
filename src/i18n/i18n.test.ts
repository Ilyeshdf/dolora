import { en } from './en';
import { fr } from './fr';
import { formatNumber, formatSigned } from './index';

type Node = Record<string, unknown>;

function walk(a: Node, b: Node, path: string[] = []): string[] {
  const problems: string[] = [];
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const p = [...path, k].join('.');
    const va = a[k];
    const vb = b[k];
    if (vb === undefined) problems.push(`missing in fr: ${p}`);
    else if (va === undefined) problems.push(`extra in fr: ${p}`);
    else if (typeof va !== typeof vb) problems.push(`type mismatch: ${p}`);
    else if (typeof va === 'object' && va && vb) problems.push(...walk(va as Node, vb as Node, [...path, k]));
    else if (typeof va === 'string' && va.trim().length === 0) problems.push(`empty en string: ${p}`);
    else if (typeof vb === 'string' && vb.trim().length === 0) problems.push(`empty fr string: ${p}`);
  }
  return problems;
}

function arity(n: Node, path: string[] = []): string[] {
  return Object.entries(n).flatMap(([k, v]) =>
    typeof v === 'function'
      ? [`${[...path, k].join('.')}:${(v as (...a: unknown[]) => unknown).length}`]
      : typeof v === 'object' && v
        ? arity(v as Node, [...path, k])
        : [],
  );
}

describe('i18n dictionaries', () => {
  it('FR covers exactly the EN keys with the same shapes', () => {
    expect(walk(en as unknown as Node, fr as unknown as Node)).toEqual([]);
  });

  it('interpolating functions take the same arity', () => {
    expect(arity(fr as unknown as Node)).toEqual(arity(en as unknown as Node));
  });

  it('keeps the permanent disclaimer in both languages', () => {
    expect(en.app.disclaimer).toMatch(/not a medical device/);
    expect(fr.app.disclaimer).toMatch(/pas un dispositif médical/);
  });
});

describe('number formatting', () => {
  it('uses a decimal point in EN and a decimal comma in FR', () => {
    expect(formatNumber(6.4, 'en')).toBe('6.4');
    expect(formatNumber(6.4, 'fr')).toBe('6,4');
  });
  it('rounds to the requested digits', () => {
    expect(formatNumber(4.25, 'en', 2)).toBe('4.25');
    expect(formatNumber(1.96, 'en', 1)).toBe('2.0');
  });
  it('signs contributions with a true minus sign', () => {
    expect(formatSigned(0.41, 'en')).toBe('+0.41');
    expect(formatSigned(-0.03, 'en')).toBe('−0.03');
    expect(formatSigned(-0.03, 'fr')).toBe('−0,03');
  });
});
