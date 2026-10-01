import { useSearchParams } from 'react-router-dom';
import { useT } from '@/i18n';
import { Footer, DeltaGlyph } from '@/components/ui/Brand';
import { Segmented } from '@/components/ui/Segmented';
import { usePrefs, type Lang, type Theme } from '@/store/prefs';
import { Sheet1 } from './Sheet1';
import { Sheet2 } from './Sheet2';
import { Sheet3 } from './Sheet3';
import { Sheet4 } from './Sheet4';
import { Extras } from './Extras';

type Tab = '1' | '2' | '3' | '4' | 'extras';
const TABS: Tab[] = ['1', '2', '3', '4', 'extras'];

/**
 * /dev/components — the A8 component sheet rebuilt from live components.
 * Tabs mirror the four A8 artboards (so each can be compared at 1920×1080) plus a tab of
 * patterns for screens that have no design yet. Theme / language switch the whole page.
 */
export function ComponentsPage() {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const raw = params.get('sheet');
  const tab: Tab = TABS.includes(raw as Tab) ? (raw as Tab) : '1';
  const theme = usePrefs((s) => s.theme);
  const setTheme = usePrefs((s) => s.setTheme);
  const lang = usePrefs((s) => s.lang);
  const setLang = usePrefs((s) => s.setLang);
  const label: Record<Tab, string> = { '1': t.dev.tabs.s1, '2': t.dev.tabs.s2, '3': t.dev.tabs.s3, '4': t.dev.tabs.s4, extras: t.dev.tabs.extras };

  return (
    <div className="themed-page flex min-h-full flex-col">
      <header className="flex items-start justify-between gap-8 px-11 pt-12">
        <div className="min-w-0">
          <h1 className="nowrap flex items-baseline gap-3 text-[44px] font-extrabold leading-[52px] tracking-[-0.02em]">
            <span className="flex items-baseline">
              ALGOS‑<DeltaGlyph />
            </span>
            <span>{t.dev.titleWord}</span>
            {tab !== 'extras' ? <span className="font-semibold text-muted">{t.dev.sheet(Number(tab))}</span> : null}
          </h1>
          <p className="nowrap mt-1 text-lg text-text-2">{tab === 'extras' ? t.dev.extras : t.dev.subtitle}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-3">
          <div className="flex items-center gap-3">
            <Segmented<Theme>
              aria-label={t.dev.theme}
              size="sm"
              value={theme}
              onChange={setTheme}
              options={[
                { value: 'projector', label: t.themes.projector },
                { value: 'night', label: t.themes.night },
                { value: 'hc', label: t.themes.hc },
              ]}
            />
            <Segmented<Lang>
              aria-label={t.dev.language}
              size="sm"
              value={lang}
              onChange={setLang}
              options={[
                { value: 'en', label: 'EN' },
                { value: 'fr', label: 'FR' },
              ]}
            />
          </div>
          <p className="nowrap text-sm text-text-2">{t.app.model('algos-delta-0.3')}</p>
        </div>
      </header>

      <nav aria-label={t.dev.sheetsNav} className="px-11 pt-5">
        <Segmented<Tab>
          aria-label={t.dev.sheetsNav}
          size="sm"
          value={tab}
          onChange={(v) => setParams({ sheet: v })}
          options={TABS.map((v) => ({ value: v, label: label[v] }))}
        />
      </nav>

      <main className="flex-1 px-11 pb-10 pt-8">
        {tab === '1' && <Sheet1 />}
        {tab === '2' && <Sheet2 />}
        {tab === '3' && <Sheet3 />}
        {tab === '4' && <Sheet4 />}
        {tab === 'extras' && <Extras />}
      </main>

      <Footer className="pb-4 pt-2" />
    </div>
  );
}
