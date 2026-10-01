import { Anchor, CircleCheck } from 'lucide-react';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { fmtCountdown } from '@/lib/time';
import { Card } from '@/components/ui/Card';
import type { ChannelView, SensorId } from '@/contracts/monitor';

/** A9 hero during calibration: progress ring m:ss / 1:30, no score until the baseline is learned. */
export function CalibrationHero({ remainingS, totalS, className }: { remainingS: number; totalS: number; className?: string }) {
  const t = useT();
  const elapsed = Math.max(0, totalS - remainingS);
  const f = Math.min(1, elapsed / totalS);
  const R = 88;
  const C = 2 * Math.PI * R;
  return (
    <Card padding="none" className={cn('flex flex-col px-8 pb-7 pt-8 compact:px-5 compact:pb-3 compact:pt-4', className)}>
      <div className="flex items-start justify-between gap-4">
        <h2 className="nowrap pt-2 text-xl font-semibold">{t.hero.estimatedPain}</h2>
        <span className="nowrap inline-flex h-9 items-center gap-2 rounded-full bg-sky px-3.5 text-base font-medium hc:border-2 hc:border-ink">
          <Anchor aria-hidden size={16} strokeWidth={1.75} />
          {t.baseline.calibrating.charAt(0).toUpperCase() + t.baseline.calibrating.slice(1)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={totalS}
        aria-valuenow={elapsed}
        aria-label={t.entry.calibration.learning}
        className="relative mx-auto mt-4 h-[200px] w-[200px] compact:h-[140px] compact:w-[140px]"
      >
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="100" cy="100" r={R} fill="none" className="stroke-track" strokeWidth="14" />
          <circle cx="100" cy="100" r={R} fill="none" className="stroke-ink" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${C * f} ${C}`} />
        </svg>
        <p className="absolute inset-0 flex items-baseline justify-center pt-[76px] font-bold compact:pt-[50px]">
          <span className="text-[44px] leading-none compact:text-3xl">{fmtCountdown(elapsed)}</span>
          <span className="ml-1 text-lg font-normal text-text-2">{t.entry.calibration.of(fmtCountdown(totalS))}</span>
        </p>
      </div>
      <h3 className="mt-6 text-2xl font-bold compact:mt-3 compact:text-xl">{t.entry.calibration.learning}</h3>
      <p className="mt-2 text-md text-text-2 compact:text-sm">{t.entry.calibration.body}</p>
    </Card>
  );
}

/** A9 "Signal check" card on the body stage. */
export function SignalCheck({ channels }: { channels: Partial<Record<SensorId, ChannelView>> }) {
  const t = useT();
  const items: { k: SensorId; label: string }[] = [
    { k: 'ppg', label: t.entry.calibration.ppg },
    { k: 'eda', label: t.entry.calibration.eda },
    { k: 'temp', label: t.entry.calibration.temp },
    { k: 'motion', label: t.entry.calibration.motion },
  ];
  return (
    <div className="absolute left-6 top-[52px] w-[258px] rounded-[20px] border-theme border-card-outline bg-card px-5 py-4 shadow-card compact:hidden hc:border-ink">
      <p className="text-md font-semibold">{t.entry.calibration.signalCheck}</p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {items.map((i) => {
          // contact / signal quality, independent of clinical masking (e.g. AF masks HRV, not PPG contact)
          const ch = channels[i.k];
          const ok = !!ch && ch.state !== 'rejected' && (ch.sqi ?? 1) >= 0.6;
          return (
            <li key={i.k} className="flex items-center gap-2.5 text-base">
              <CircleCheck aria-hidden size={20} strokeWidth={2} className={ok ? 'text-sensor-ok' : 'text-sensor-degraded'} />
              {i.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
