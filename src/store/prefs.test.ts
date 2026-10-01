import { usePrefs } from './prefs';

describe('prefs store', () => {
  beforeEach(() => usePrefs.setState({ theme: 'projector', lang: 'en' }));

  it('defaults to the Projector theme (§10.1)', () => {
    expect(usePrefs.getState().theme).toBe('projector');
  });

  it('cycles Projector → Night → High contrast → Projector (T shortcut)', () => {
    const { cycleTheme } = usePrefs.getState();
    cycleTheme();
    expect(usePrefs.getState().theme).toBe('night');
    cycleTheme();
    expect(usePrefs.getState().theme).toBe('hc');
    cycleTheme();
    expect(usePrefs.getState().theme).toBe('projector');
  });

  it('toggles EN ↔ FR (L shortcut)', () => {
    usePrefs.getState().toggleLang();
    expect(usePrefs.getState().lang).toBe('fr');
    usePrefs.getState().toggleLang();
    expect(usePrefs.getState().lang).toBe('en');
  });

  it('persists only display preferences (D-15)', () => {
    const raw = window.localStorage.getItem('algos-delta-prefs');
    expect(raw).not.toBeNull();
    expect(Object.keys(JSON.parse(raw ?? '{}').state).sort()).toEqual(['lang', 'theme']);
  });
});
