import { createContext, createElement, useContext, type ReactNode } from 'react';
import { en, type Dict } from './en';
import { fr } from './fr';
import { usePrefs, type Lang } from '@/store/prefs';

export const dictionaries: Record<Lang, Dict> = { en, fr };

/** Optional subtree override (used by /dev/components to show the FR variant next to EN). */
const LangOverride = createContext<Lang | null>(null);

export function LangScope({ lang, children }: { lang: Lang; children: ReactNode }) {
  return createElement(LangOverride.Provider, { value: lang }, children);
}

export function useLang(): Lang {
  const override = useContext(LangOverride);
  const lang = usePrefs((s) => s.lang);
  return override ?? lang;
}

/** Current dictionary. Components read strings as `t.section.key` (typed). */
export function useT(): Dict {
  return dictionaries[useLang()];
}

/** Locale-aware number formatting — FR uses a decimal comma (A8 sheet 1). */
export function formatNumber(value: number, lang: Lang, digits = 1): string {
  return new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Signed number with a true minus sign (U+2212), e.g. +0.41 / −2.3. */
export function formatSigned(value: number, lang: Lang, digits = 2): string {
  const abs = formatNumber(Math.abs(value), lang, digits);
  return value < 0 ? `−${abs}` : `+${abs}`;
}

/** Picks the current-language text from engine-supplied bilingual text (spec §5.1 text_en / text_fr). */
export function useL10n(): (x: { en: string; fr: string }) => string {
  const lang = useLang();
  return (x) => x[lang];
}

export function useFormat() {
  const lang = useLang();
  return {
    lang,
    num: (v: number, digits = 1) => formatNumber(v, lang, digits),
    signed: (v: number, digits = 2) => formatSigned(v, lang, digits),
  };
}

export type { Dict };
