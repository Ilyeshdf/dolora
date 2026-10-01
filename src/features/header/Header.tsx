import { useState } from 'react';
import { NavLink, useLocation, useParams } from 'react-router-dom';
import { Contrast, Moon, Sun } from 'lucide-react';
import { useL10n, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { usePrefs } from '@/store/prefs';
import { useMonitor } from '@/store/monitor';
import { Wordmark } from '@/components/ui/Brand';
import { Button } from '@/components/ui/Button';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/Overlay';
import { StatusPill } from '@/components/ui/StatusPill';
import { NoSignalIcon } from '@/components/clinical/icons';
import { BaselinePill, ConnectionPill, ModeConfirmBody, ModeControl, type Mode } from '@/components/clinical/HeaderPills';

/**
 * Global header (§6.2, A1). Left: wordmark + patient pill. Centre: pill nav. Right: ICU/Ward +
 * rule, "Assessment unavailable" (REJECTED only, D-8), connection, baseline, theme, language,
 * help, clinician. Every label is single-line (D-0); compact density trims secondary text (D-43).
 */
export function Header() {
  const t = useT();
  const l = useL10n();
  const view = useMonitor((s) => s.view);
  const confirmMode = useMonitor((s) => s.confirmMode);
  const clinician = useMonitor((s) => s.clinician);
  const theme = usePrefs((s) => s.theme);
  const cycleTheme = usePrefs((s) => s.cycleTheme);
  const lang = usePrefs((s) => s.lang);
  const toggleLang = usePrefs((s) => s.toggleLang);
  const { bedId = '4' } = useParams();
  const location = useLocation();
  const isUnit = location.pathname.startsWith('/unit');
  const [pendingMode, setPendingMode] = useState<Mode | null>(null);
  const ThemeIcon = theme === 'projector' ? Moon : theme === 'night' ? Sun : Contrast;
  const rejected = view.status === 'REJECTED';

  const navItem = (active: boolean) =>
    cn(
      'nowrap inline-flex h-11 items-center rounded-full px-3 text-md font-medium transition-colors duration-150 compact:h-9 compact:px-3.5 compact:text-base',
      active ? 'bg-pill-active font-semibold text-pill-active-fg' : 'text-text-2 hover:bg-subtle hover:text-ink',
    );

  return (
    <header className="flex h-18 shrink-0 items-center justify-between gap-4 px-8 compact:h-15 compact:gap-2 compact:px-4">
      <div className="flex min-w-0 items-center gap-4 compact:gap-2">
        <Wordmark compact={false} className="compact:[&>span:last-child]:hidden" />
        {!isUnit && (
          <span
            className="nowrap inline-flex h-10 min-w-0 items-center gap-1.5 rounded-full border-theme border-card-border bg-card px-3.5 text-base hc:border-ink"
            aria-label={t.header.patient(view.patient.ref, view.patient.bed)}
            title={`${view.patient.ref} · ${t.header.bed(view.patient.bed)} · ${l(view.patient.setting)} · ${l(view.patient.day)}`}
          >
            <span className="font-bold">{view.patient.ref}</span>
            <span className="truncate text-text-2">
              · {t.header.bed(view.patient.bed)}
              <span className="compact:hidden">
                {' '}· {l(view.patient.setting)} · {l(view.patient.day)}
              </span>
            </span>
          </span>
        )}
      </div>

      <nav aria-label={t.header.main} className="shrink-0">
        <ul className="flex items-center gap-0.5 rounded-full border-theme border-card-border bg-card p-1 hc:border-ink">
          <li>
            <NavLink to="/unit" className={({ isActive }) => navItem(isActive)}>
              {t.nav.unit}
            </NavLink>
          </li>
          <li>
            <NavLink to={`/bed/${bedId}/monitor`} className={({ isActive }) => navItem(isActive)} end>
              {t.nav.monitor}
            </NavLink>
          </li>
          <li>
            <NavLink to={`/bed/${bedId}/timeline`} className={({ isActive }) => navItem(isActive)}>
              {t.nav.timeline}
            </NavLink>
          </li>
          <li>
            <NavLink to={`/bed/${bedId}/assessments`} className={({ isActive }) => navItem(isActive)}>
              {t.nav.assessments}
            </NavLink>
          </li>
          <li>
            <NavLink to={`/bed/${bedId}/audit`} className={({ isActive }) => navItem(isActive)}>
              {t.nav.audit}
            </NavLink>
          </li>
        </ul>
      </nav>

      <div className="flex shrink-0 items-center gap-2 compact:gap-1.5">
        <Popover open={pendingMode !== null} onOpenChange={(o) => !o && setPendingMode(null)}>
          <PopoverAnchor asChild>
            <div className={cn(rejected && '[&_p]:hidden', 'compact:[&_p]:hidden')}>
              <ModeControl mode={view.mode} onRequest={setPendingMode} />
            </div>
          </PopoverAnchor>
          <PopoverContent align="end" className="w-[400px] px-6 py-6">
            {pendingMode ? (
              <ModeConfirmBody
                target={pendingMode}
                onCancel={() => setPendingMode(null)}
                onConfirm={() => {
                  confirmMode(pendingMode);
                  setPendingMode(null);
                }}
              />
            ) : null}
          </PopoverContent>
        </Popover>

        {rejected ? (
          <StatusPill tone="slate" icon={<NoSignalIcon className="h-[18px] w-[18px]" />} className="compact:hidden">
            {t.header.assessmentUnavailable}
          </StatusPill>
        ) : null}

        <ConnectionPill kind={view.connection} />
        <span className="compact:hidden">
          <BaselinePill state={view.baseline} />
        </span>

        <Button variant="icon" size="icon" aria-label={t.header.theme(t.themes[theme])} onClick={cycleTheme}>
          <ThemeIcon aria-hidden size={20} strokeWidth={1.75} />
        </Button>
        <Button variant="icon" size="icon" aria-label={t.header.language} onClick={toggleLang} className="text-base font-bold">
          {lang.toUpperCase()}
        </Button>
        <HelpButton />
        <span
          aria-label={t.header.clinician(clinician)}
          role="img"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sky text-base font-bold hc:border-2 hc:border-ink"
        >
          {clinician}
        </span>
      </div>
    </header>
  );
}

function HelpButton() {
  const t = useT();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="icon" size="icon" aria-label={t.header.help} className="text-lg font-bold">
          <span aria-hidden>?</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px]">
        <h2 className="text-lg font-semibold">{t.header.shortcuts}</h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {t.header.shortcutList.map(([k, v]) => (
            <div key={k} className="contents">
              <dt>
                <kbd className="nowrap rounded-[6px] border border-card-border bg-subtle px-1.5 py-0.5 font-sans text-xs font-semibold hc:border-ink">{k}</kbd>
              </dt>
              <dd className="text-text-2">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted">{t.header.shortcutsNote}</p>
      </PopoverContent>
    </Popover>
  );
}
