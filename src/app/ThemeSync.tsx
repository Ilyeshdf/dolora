import { useEffect } from 'react';
import { usePrefs } from '@/store/prefs';

/** Mirrors theme + language preferences onto <html> (data-theme drives every token). */
export function ThemeSync() {
  const theme = usePrefs((s) => s.theme);
  const lang = usePrefs((s) => s.lang);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
