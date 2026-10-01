import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useL10n, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { useMonitor } from '@/store/monitor';
import { FIXTURE_IDS, type FixtureId } from '@/fixtures/monitorFixtures';
import { Footer } from '@/components/ui/Brand';
import { PainHeroCard } from '@/components/clinical/PainHeroCard';
import { ArousalPainCard } from '@/components/clinical/Gauges';
import { Header } from '@/features/header/Header';
import { ContextBar } from '@/features/context-bar/ContextBar';
import { BodyStage } from '@/features/body-map/BodyStage';
import { TimelineCard } from '@/features/timeline/TimelineCard';
import { AttributionCard, DriversCard, LiveSignalsCard } from '@/features/cards/RightCards';
import { AssessmentDialog } from '@/features/cpot/AssessmentDialog';
import { AuditDrawer } from '@/features/audit/AuditDrawer';
import { AlertSlotView } from './AlertSlotView';
import { useCompact } from './useCompact';

/**
 * Monitor screen — A1–A7 at 1920×1080 with no page scroll; compact density at ≤ 1599 px wide or
 * ≤ 899 px high (1366×768), D-43.
 *
 * Phase 2 renders design fixtures selected by URL: ?state=pain|stress|abstain|degraded,
 * &dialog=assessment (&prefill=a5), &panel=audit, &hover=<driver id>. Live data replaces the
 * fixtures in Phase 4 through the same MonitorView type.
 */
export function MonitorPage() {
  const [params] = useSearchParams();
  const compact = useCompact();
  const load = useMonitor((s) => s.load);
  const setDialog = useMonitor((s) => s.setDialog);
  const setPanel = useMonitor((s) => s.setPanel);
  const setHighlight = useMonitor((s) => s.setHighlight);
  const toggleRail = useMonitor((s) => s.toggleRail);

  const state = (FIXTURE_IDS.includes(params.get('state') as FixtureId) ? params.get('state') : 'pain') as FixtureId;
  const hover = params.get('hover');

  useEffect(() => {
    load(state);
    // A4 shows the drivers layer switched off on the tool rail.
    if (state === 'degraded' && useMonitor.getState().rail.drivers) toggleRail('drivers');
    if (state !== 'degraded' && !useMonitor.getState().rail.drivers) toggleRail('drivers');
  }, [state, load, toggleRail]);

  useEffect(() => {
    setDialog(params.get('dialog') === 'assessment' ? 'assessment' : null);
    setPanel(params.get('panel') === 'audit' ? 'audit' : null);
  }, [params, setDialog, setPanel]);

  useEffect(() => {
    if (!hover) return;
    const d = useMonitor.getState().view.drivers.find((x) => x.id === hover);
    setHighlight(hover, d?.sensor ?? null);
  }, [hover, state, setHighlight]);

  // Drawer top = top of the main grid (D-27).
  const mainRef = useRef<HTMLDivElement>(null);
  const [mainTop, setMainTop] = useState(209);
  useLayoutEffect(() => {
    const measure = () => setMainTop(mainRef.current?.getBoundingClientRect().top ?? 209);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [compact]);

  return (
    <div className={cn('themed-page flex h-dvh min-h-0 flex-col overflow-hidden', compact && 'compact')}>
      <Header />
      <ContextBar />
      <div className="mt-2">
        <AlertSlotView />
      </div>
      <main
        ref={mainRef}
        className="mt-[17px] grid min-h-0 flex-1 grid-cols-[440px_minmax(0,1fr)_440px] gap-6 px-8 compact:mt-3 compact:grid-cols-[350px_minmax(0,1fr)_370px] compact:gap-4 compact:px-4"
      >
        <LeftColumn compact={compact} />
        <div className="relative min-h-0">
          <BodyStage reserveBottom={compact ? 208 : 238} />
          <TimelineCard className="absolute inset-x-0 bottom-0 h-[238px] compact:h-[208px]" />
        </div>
        <div className="flex min-h-0 flex-col gap-[25px] compact:gap-3 compact:overflow-y-auto">
          <AttributionCard className="h-[220px] shrink-0 compact:h-auto" />
          <DriversCard className="h-[304px] shrink-0 compact:h-auto compact:min-h-0 compact:flex-1" forceTooltip={hover} />
          <LiveSignalsCard className="min-h-0 flex-1 compact:flex-none" />
        </div>
      </main>
      <Footer className="h-[41px] shrink-0 compact:h-8" />
      <AssessmentDialog prefill={params.get('prefill') === 'a5'} />
      <AuditDrawer top={mainTop} />
    </div>
  );
}

function LeftColumn({ compact }: { compact: boolean }) {
  const t = useT();
  const l = useL10n();
  const view = useMonitor((s) => s.view);
  const setDialog = useMonitor((s) => s.setDialog);
  const ref = view.lastReference;
  const lastRef = ref ? t.hero.lastReference(ref.scale, String(ref.value), ref.ageMin === 0 ? t.common.now.toLowerCase() : t.common.ago(t.common.minutesShort(ref.ageMin))) : null;
  const lv = view.lastValid;
  return (
    <div className="flex min-h-0 flex-col gap-[25px] compact:gap-3 compact:overflow-y-auto">
      {view.pain ? (
        <PainHeroCard
          state="ok"
          compact={compact}
          className="h-[478px] shrink-0 compact:h-auto"
          score={view.pain.score}
          lo={view.pain.lo}
          hi={view.pain.hi}
          trend={view.pain.trend}
          episode={view.pain.episode}
          notAttributed={view.pain.notAttributed}
          degraded={view.reducedSensors ? { reducedSensors: l(view.reducedSensors) } : null}
          coverageNotValidated={!view.pain.coverageValidated}
          lastReference={lastRef}
        />
      ) : (
        <PainHeroCard
          state="abstain"
          className="h-[478px] shrink-0 compact:h-auto"
          lastValid={lv && lv.ageS <= 300 ? { score: lv.score, age: t.common.ago(t.common.secondsShort(lv.ageS)) } : null}
          reasons={view.abstainReasons.map((r) => ({ kind: r.kind, text: l(r.text) }))}
          lastReference={lastRef}
          onPerform={() => setDialog('assessment')}
        />
      )}
      <ArousalPainCard
        className="min-h-0 flex-1 compact:flex-none"
        z={view.arousalZ}
        pain={view.pain?.score ?? null}
        hi={view.pain?.hi}
        notEqual={!!view.pain?.notAttributed}
        state={view.status === 'REJECTED' ? 'paused' : view.baseline === 'calibrating' ? 'waiting' : 'live'}
      />
    </div>
  );
}
