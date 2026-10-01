import { useNavigate, useParams } from 'react-router-dom';
import { ArrowUpRight, Info } from 'lucide-react';
import { useFormat, useL10n, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { useMonitor } from '@/store/monitor';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { AttributionBar } from '@/components/clinical/AttributionBar';
import { DriverRow } from '@/components/clinical/DriverRow';
import { TelemetryRow } from '@/components/clinical/Telemetry';
import { NoSignalIcon } from '@/components/clinical/icons';

/** Card heading with an info tooltip saying which question the card answers (D-5). */
function CardHeading({ title, subtitle, help, id }: { title: string; subtitle?: string; help: string; id: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0">
        <h2 id={id} className="nowrap text-xl font-semibold leading-7">
          {title}
        </h2>
        {subtitle ? <p className="nowrap mt-0.5 text-sm text-muted compact:hidden">{subtitle}</p> : null}
      </div>
      <Tooltip content={help} side="left">
        <button type="button" aria-label={help} className="ml-auto mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted hover:bg-subtle hover:text-ink">
          <Info aria-hidden size={16} strokeWidth={1.75} />
        </button>
      </Tooltip>
    </div>
  );
}

/** "What is driving the arousal?" — explains WHY the arousal is attributed (Head B, D-5). */
export function AttributionCard({ className }: { className?: string }) {
  const t = useT();
  const view = useMonitor((s) => s.view);
  return (
    <Card padding="none" aria-labelledby="attr-title" className={cn('px-6 pb-6 pt-7 compact:px-5 compact:pb-3 compact:pt-4', className)} role="region">
      <CardHeading id="attr-title" title={t.attribution.title} help={t.cards.attributionHelp} />
      <AttributionBar className="mt-4" shares={view.attribution} agitationLabel={view.mode === 'WARD' ? 'activity' : 'agitation'} />
    </Card>
  );
}

/** "Top drivers" — what moves the PAIN SCORE (Head A SHAP, D-5). Hover ↔ body hotspot (§11.1). */
export function DriversCard({ className, forceTooltip }: { className?: string; forceTooltip?: string | null }) {
  const t = useT();
  const l = useL10n();
  const f = useFormat();
  const drivers = useMonitor((s) => s.view.drivers);
  const notAttributed = useMonitor((s) => !!s.view.pain?.notAttributed);
  const highlight = useMonitor((s) => s.highlight);
  const sensorHighlight = useMonitor((s) => s.sensorHighlight);
  const setHighlight = useMonitor((s) => s.setHighlight);

  return (
    <Card padding="none" role="region" aria-labelledby="drv-title" className={cn('flex flex-col overflow-hidden px-3 pb-3 pt-6 compact:pb-1.5 compact:pt-4', className)}>
      <div className="px-3">
        <CardHeading id="drv-title" title={t.drivers.title} subtitle={t.drivers.subtitle} help={notAttributed ? `${t.cards.driversHelp} ${t.cards.lowContribution}` : t.cards.driversHelp} />
      </div>
      {drivers.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-8 text-center compact:gap-1 compact:px-4">
          <span className="grid h-13 w-13 place-items-center rounded-full bg-track hc:border-2 hc:border-ink compact:hidden">
            <NoSignalIcon className="h-6 w-6 text-text-2" />
          </span>
          <p className="text-lg font-semibold">{t.drivers.emptyTitle}</p>
          <p className="text-sm leading-5 text-text-2">{t.drivers.emptyBody}</p>
        </div>
      ) : (
        <ul className="mt-2.5 flex min-h-0 flex-col gap-1 compact:mt-1 compact:gap-0 compact:overflow-y-auto">
          {drivers.map((d) => {
            const active = highlight === d.id || sensorHighlight === d.sensor;
            return (
              <li key={d.id}>
                <Tooltip
                  side="left"
                  open={forceTooltip === d.id ? true : undefined}
                  content={t.drivers.tooltip(`${f.num(d.raw.value, d.raw.digits)} ${d.raw.unit}`, f.num(d.baseline, d.raw.digits || 1), f.num(d.z), f.signed(d.contribution), f.num(d.reliability, 2))}
                >
                  <DriverRow
                    title={l(d.title)}
                    subline={l(d.subline)}
                    direction={d.direction}
                    contribution={d.contribution}
                    weight={d.weight}
                    highlighted={active}
                    onMouseEnter={() => setHighlight(d.id, d.sensor)}
                    onMouseLeave={() => setHighlight(null, null)}
                    onFocus={() => setHighlight(d.id, d.sensor)}
                    onBlur={() => setHighlight(null, null)}
                  />
                </Tooltip>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/** Dark monitor-style live signals card (A1). Telemetry is decoupled from React state in Phase 4. */
export function LiveSignalsCard({ className }: { className?: string }) {
  const t = useT();
  const l = useL10n();
  const telemetry = useMonitor((s) => s.view.telemetry);
  const navigate = useNavigate();
  const { bedId = '4' } = useParams();
  const name = { ppg: t.sensors.ppg, eda: t.sensors.eda, temp: t.telemetry.skinTemp, motion: t.sensors.motion };
  const stateText = { ok: t.sensors.ok, degraded: t.sensors.degraded, rejected: t.sensors.rejected, masked: t.sensors.masked };
  return (
    <Card tone="monitor" padding="none" role="region" aria-labelledby="tele-title" className={cn('flex flex-col px-6 pb-3 pt-5 compact:px-5 compact:pb-3 compact:pt-3', className)}>
      <div className="flex items-center justify-between">
        <h2 id="tele-title" className="nowrap text-xl font-semibold text-monitor-fg">
          {t.telemetry.title}
        </h2>
        <Button variant="action" size="icon" aria-label={t.telemetry.open} onClick={() => navigate(`/bed/${bedId}/timeline`)}>
          <ArrowUpRight aria-hidden size={20} strokeWidth={1.75} />
        </Button>
      </div>
      {/* Compact: values + state in a 2×2 grid (traces need width), D-43. */}
      <ul className="mt-1 hidden grid-cols-2 gap-x-4 gap-y-2 compact:grid">
        {telemetry.map((row) => (
          <li key={row.channel} className="min-w-0">
            <p className="nowrap text-xs text-monitor-muted">
              {name[row.channel]} · {stateText[row.state]}
            </p>
            <p className="nowrap truncate text-base font-bold text-monitor-fg">{l(row.value)}</p>
          </li>
        ))}
      </ul>
      <ul className="mt-1 flex flex-col compact:hidden">
        {telemetry.map((row, i) => (
          <li key={row.channel} className={cn('py-[3px]', i > 0 && 'border-t border-monitor-line')}>
            <TelemetryRow
              channel={row.channel}
              label={row.sub ? `${name[row.channel]} · ${l(row.sub)}` : name[row.channel]}
              value={l(row.value)}
              state={row.state}
              rejectedReason={row.rejectedReason ? l(row.rejectedReason) : undefined}
              seed={i + 1}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
