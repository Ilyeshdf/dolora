import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';

export type Theme = 'projector' | 'night' | 'hc';
export type Lang = 'en' | 'fr';

export const THEMES: readonly Theme[] = ['projector', 'night', 'hc'];

interface PrefsState {
  theme: Theme;
  lang: Lang;
  setTheme: (t: Theme) => void;
  cycleTheme: () => void;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
}

/**
 * Only display preferences are persisted (D-15). Storage access can throw (private mode,
 * blocked site data), so every call is guarded and the app works without it.
 */
const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      /* preferences simply don't persist */
    }
  },
  removeItem: (k) => {
    try {
      window.localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

export const usePrefs = create<PrefsState>()(
  persist(
    (set, get) => ({
      theme: 'projector',
      lang: 'en',
      setTheme: (theme) => set({ theme }),
      cycleTheme: () => {
        const i = THEMES.indexOf(get().theme);
        set({ theme: THEMES[(i + 1) % THEMES.length] ?? 'projector' });
      },
      setLang: (lang) => set({ lang }),
      toggleLang: () => set({ lang: get().lang === 'en' ? 'fr' : 'en' }),
    }),
    {
      name: 'algos-delta-prefs',
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ theme: s.theme, lang: s.lang }),
    },
  ),
);
