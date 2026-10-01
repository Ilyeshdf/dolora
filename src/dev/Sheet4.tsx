import { useT } from '@/i18n';
import { Card } from '@/components/ui/Card';
import { ConnectionPill } from '@/components/clinical/HeaderPills';
import { TelemetryRow } from '@/components/clinical/Telemetry';
import { AbstentionGlyph, AlertTriangleGlyph, DiamondGlyph, EventRegionGlyph } from '@/components/clinical/TimelineMarkers';
import type { Theme } from '@/store/prefs';
import { cn } from '@/lib/cn';
import { SectionHeader, ThemeScope, TokenSwatch, VariantLabel } from './helpers';

type Sw = { token: string; label: string; pattern?: string };

const PROJECTOR: Sw[] = [
  { token: 'page-from', label: 'Page' }, { token: 'card', label: 'Card' },
  { token: 'card-border', label: 'Card border' }, { token: 'ink', label: 'Ink' },
  { token: 'text-2', label: 'Text secondary' }, { token: 'muted', label: 'Text muted' },
  { token: 'pill-active', label: 'Dark pill / card' }, { token: 'butter', label: 'Pastel butter' },
  { token: 'sky', label: 'Pastel sky' }, { token: 'action', label: 'Action yellow' },
  { token: 'accent', label: 'Interactive accent' }, { token: 'pain-mild', label: 'Pain mild' },
  { token: 'pain-moderate', label: 'Pain moderate' }, { token: 'pain-severe', label: 'Pain severe' },
  { token: 'band', label: 'Uncertainty band' }, { token: 'alert', label: 'Alert red' },
  { token: 'advisory-fill', label: 'Advisory fill' }, { token: 'advisory-border', label: 'Advisory border' },
  { token: 'advisory-text', label: 'Advisory text' }, { token: 'sensor-ok', label: 'Sensor OK' },
  { token: 'sensor-degraded', label: 'Sensor degraded' }, { token: 'sensor-rejected', label: 'Sensor rejected' },
  { token: 'monitor', label: 'Monitor card' }, { token: 'trace-ppg', label: 'Trace PPG' },
  { token: 'trace-eda', label: 'Trace EDA' }, { token: 'trace-temp', label: 'Trace temperature' },
  { token: 'trace-motion', label: 'Trace motion' }, { token: 'arousal', label: 'Arousal line' },
];
const NIGHT: Sw[] = [
  { token: 'page-from', label: 'Page' }, { token: 'card', label: 'Card' },
  { token: 'card-border', label: 'Card border' }, { token: 'ink', label: 'Text primary' },
  { token: 'text-2', label: 'Text secondary' }, { token: 'muted', label: 'Text muted' },
  { token: 'pill-active', label: 'Active pill' }, { token: 'butter', label: 'Butter tint' },
  { token: 'sky', label: 'Sky tint' }, { token: 'action', label: 'Action yellow' },
  { token: 'arousal', label: 'Arousal line' }, { token: 'pain-mild', label: 'Pain mild' },
  { token: 'pain-moderate', label: 'Pain moderate' }, { token: 'pain-severe', label: 'Pain severe' },
  { token: 'band', label: 'Uncertainty band' }, { token: 'alert', label: 'Alert red' },
  { token: 'sensor-ok', label: 'Sensor OK' }, { token: 'sensor-degraded', label: 'Sensor degraded' },
  { token: 'sensor-rejected', label: 'Sensor rejected' }, { token: 'monitor', label: 'Monitor card' },
];
const HC: Sw[] = [
  { token: 'page-from', label: 'Page' }, { token: 'card', label: 'Card' },
  { token: 'card-border', label: 'Card border · 2 px' }, { token: 'ink', label: 'Text primary' },
  { token: 'text-2', label: 'Text secondary' }, { token: 'muted', label: 'Text muted' },
  { token: 'pill-active', label: 'Active pill' }, { token: 'focus', label: 'Accent · focus ring' },
  { token: 'alert', label: 'Alert banner' }, { token: 'band', label: 'Uncertainty band' },
  { token: '', label: 'Pain mild · Dots', pattern: 'pat-dots text-ink' },
  { token: '', label: 'Pain moderate · Stripes', pattern: 'pat-stripes text-ink' },
  { token: '', label: 'Pain severe · Solid', pattern: 'bg-ink' },
  { token: '', label: 'Rest share · Cross-hatch', pattern: 'pat-crosshatch text-ink' },
  { token: '', label: 'Unexplained share · Sparse hatch', pattern: 'pat-sparse text-ink' },
  { token: 'trace-ppg', label: 'Traces' },
];

/** A8 sheet 4 — connection pills, telemetry mini-trace, timeline markers, colour tokens. */
export function Sheet4() {
  const t = useT();
  const markers = [
    { glyph: <EventRegionGlyph />, title: t.timeline.eventRegion, desc: t.timeline.eventRegionDesc },
    { glyph: <DiamondGlyph />, title: t.timeline.cpotDiamond, desc: t.timeline.cpotDiamondDesc },
    { glyph: <AlertTriangleGlyph />, title: t.timeline.alertTriangle, desc: t.timeline.alertTriangleDesc },
    { glyph: <AbstentionGlyph />, title: t.timeline.abstention, desc: t.timeline.abstentionDesc },
    { glyph: <AlertTriangleGlyph ghost />, title: t.timeline.ghost, desc: t.timeline.ghostDesc },
  ];
  return (
    <div className="mx-auto flex w-full flex-col gap-10">
      <div className="grid grid-cols-[300px_420px] gap-5 min-[1500px]:grid-cols-[300px_420px_1fr]">
        <section>
          <SectionHeader n="09" title={t.dev.sections.connection} />
          <div className="mt-3 flex flex-col items-start gap-2">
            <VariantLabel className="mb-0">{t.connection.live}</VariantLabel>
            <ConnectionPill kind="live" size="sm" />
            <VariantLabel className="mb-0 mt-2">{t.connection.simulator}</VariantLabel>
            <ConnectionPill kind="simulator" size="sm" />
            <VariantLabel className="mb-0 mt-2">{t.connection.reconnecting(6).split(' · ')[0]}</VariantLabel>
            <ConnectionPill kind="reconnecting" seconds={6} size="sm" />
            <VariantLabel className="mb-0 mt-2">{t.dev.variants.offlineNote}</VariantLabel>
            <ConnectionPill kind="offline" age={t.common.ago(t.common.minutesShort(2))} size="sm" />
            <VariantLabel className="mb-0 mt-2">{t.connection.paused.split(' — ')[0]} · D-11</VariantLabel>
            <ConnectionPill kind="paused" size="sm" />
          </div>
        </section>
        <section>
          <SectionHeader n="12" title={t.dev.sections.telemetry} />
          <Card tone="monitor" padding="md" className="mt-3 flex flex-col gap-3 px-5 py-4">
            <TelemetryRow channel="ppg" label={`${t.sensors.ppg} · ${t.sensors.ok}`} value={t.telemetry.hr('104')} state="ok" />
            <TelemetryRow channel="ppg" label={`${t.sensors.ppg} · ${t.sensors.rejected.toLowerCase()}`} value={t.telemetry.hrNone} state="rejected" rejectedReason={t.telemetry.rejectedMotion} seed={3} />
          </Card>
        </section>
        <section className="col-span-2 min-[1500px]:col-span-1">
          <SectionHeader n="13" title={t.dev.sections.timelineLegend} />
          <Card padding="md" className="mt-3 grid grid-cols-5 gap-4 px-5">
            {markers.map((m) => (
              <div key={m.title}>
                <div className="flex h-9 items-center">{m.glyph}</div>
                <p className="mt-2 text-sm font-medium">{m.title}</p>
                <p className="mt-1 text-xs text-text-2">{m.desc}</p>
              </div>
            ))}
          </Card>
        </section>
      </div>

      <section>
        <SectionHeader n="14" title={t.dev.sections.tokens} />
        <div className="mt-3 grid grid-cols-3 gap-5">
          <TokenPanel theme="projector" title={t.themes.projector} swatches={PROJECTOR} />
          <TokenPanel theme="night" title={t.themes.night} swatches={NIGHT} />
          <TokenPanel theme="hc" title={t.themes.hc} swatches={HC} />
        </div>
      </section>
    </div>
  );
}

function TokenPanel({ theme, title, swatches }: { theme: Theme; title: string; swatches: Sw[] }) {
  return (
    <ThemeScope theme={theme} className={cn('rounded-card border-theme border-card-outline bg-card p-5 shadow-card')}>
      <h3 className="mb-3 text-lg font-semibold">{title}</h3>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-2">
        {swatches.map((s) => (
          <TokenSwatch key={s.label} token={s.token} label={s.label} pattern={s.pattern} />
        ))}
      </ul>
    </ThemeScope>
  );
}
