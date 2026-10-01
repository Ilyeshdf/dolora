import type { ReactNode } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, ClipboardList, Info } from 'lucide-react';
import { useFormat, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/ui/StatusPill';
import { ScaleBar } from './ScaleBar';
import { SeverityPill } from './severity';
import { severityOf } from '@/lib/clinical';
import { HalfRingIcon, NoSignalIcon, RejectedIcon } from './icons';

export interface HeroOkProps {
  state: 'ok';
  score: number;
  lo: number;
  hi: number;
  trend: { direction: 'rising' | 'falling' | 'stable'; slopePerMin: number };
  /** e.g. { since: '14:30:21', elapsed: '2 min 31 s' } or null when no episode. */
  episode: { since: string; elapsed: string } | null;
  /** Degraded context: wider interval note + badges replace the trend row (A4). */
  degraded?: { reducedSensors: string } | null;
  coverageNotValidated?: boolean;
  /** Stress state info chip (A2). */
  notAttributed?: boolean;
  signalsLabel?: string;
}

export interface HeroAbstainProps {
  state: 'abstain';
  lastValid: { score: number; age: string } | null;
  reasons: { kind: 'rejected' | 'degraded'; text: string }[];
  onPerform?: () => void;
}

export type PainHeroCardProps = (HeroOkProps | HeroAbstainProps) & { className?: string; compact?: boolean };

/** Pain hero card — A8 sheet 1 §01 (ok mild/moderate/severe, degraded, rejected, FR). */
export function PainHeroCard(props: PainHeroCardProps) {
  const t = useT();
  return (
    <Card padding="none" className={cn('flex flex-col px-8 pb-7 pt-8', props.className)}>
      {props.state === 'ok' ? <HeroOk {...props} /> : <HeroAbstain {...props} />}
      <span className="sr-only">{t.hero.estimatedPain}</span>
    </Card>
  );
}

function HeroHeader({ right }: { right: ReactNode }) {
  const t = useT();
  return (
    <div className="flex items-start justify-between gap-4">
      <h2 className="nowrap pt-2 text-xl font-semibold">{t.hero.estimatedPain}</h2>
      {right}
    </div>
  );
}

function HeroOk(p: HeroOkProps & { compact?: boolean }) {
  const t = useT();
  const f = useFormat();
  const sev = severityOf(p.score);
  const TrendIcon = p.trend.direction === 'rising' ? ArrowUp : p.trend.direction === 'falling' ? ArrowDown : ArrowRight;

  return (
    <>
      <HeroHeader right={<SeverityPill severity={sev} />} />
      <p className={cn('mt-1 flex items-baseline font-bold tracking-[-0.03em]', p.compact ? 'text-hero-sm' : 'text-hero')}>
        <span className="transition-opacity duration-150">{f.num(p.score)}</span>
        <span className="ml-1 text-hero-unit font-normal tracking-normal text-text-2">{t.hero.outOf10}</span>
      </p>

      <ScaleBar className="mt-5" score={p.score} lo={p.lo} hi={p.hi} />

      {p.notAttributed ? (
        <Badge tone="neutral" size="lg" className="mt-4 self-start" icon={<Info aria-hidden size={18} strokeWidth={1.75} />}>
          {t.hero.notAttributed}
        </Badge>
      ) : null}

      <div className="mt-4 flex items-center gap-3 text-md">
        <span aria-hidden className="h-2.5 w-6 rounded-full bg-band" />
        <span className="nowrap text-text-2">{t.scale.interval80}</span>
        {p.degraded ? <span className="nowrap text-sm text-muted">· {t.scale.wider}</span> : null}
        <span className="nowrap ml-auto font-bold">
          {f.num(p.lo)} – {f.num(p.hi)}
        </span>
      </div>

      {p.degraded || p.coverageNotValidated ? (
        <div className="mt-4 flex flex-col items-start gap-2 border-t border-card-border pt-4 hc:border-ink">
          {p.degraded ? (
            <Badge tone="advisory" icon={<HalfRingIcon className="h-3.5 w-3.5" />}>
              {t.hero.reducedSensors(p.degraded.reducedSensors)}
            </Badge>
          ) : null}
          {p.coverageNotValidated ? (
            <Badge tone="advisory" icon={<Info aria-hidden size={15} strokeWidth={1.75} />}>
              {t.hero.coverageNotValidated}
            </Badge>
          ) : null}
        </div>
      ) : null}

      {!p.degraded ? (
        <div className="mt-auto border-t border-card-border pt-4 hc:border-ink">
          <div className="flex items-center gap-3">
            <span className="nowrap flex items-center gap-1 text-lg font-bold">
              <TrendIcon aria-hidden size={18} strokeWidth={2.25} />
              {p.trend.direction === 'stable' ? t.hero.stable : `${f.num(p.trend.slopePerMin)} ${t.hero.perMin}`}
            </span>
            <span className="nowrap text-sm text-muted">{t.hero.trend}</span>
            <StatusPill size="sm" dot="ok" className="ml-auto">
              {p.signalsLabel ?? t.hero.signalsOk}
            </StatusPill>
          </div>
          <p className="nowrap mt-2 text-sm text-text-2">
            {p.episode ? (
              <>
                {t.hero.episodeSince} <span className="font-bold text-ink">{p.episode.since}</span> · {p.episode.elapsed}
              </>
            ) : (
              t.hero.noEpisode
            )}
          </p>
        </div>
      ) : null}
    </>
  );
}

function HeroAbstain(p: HeroAbstainProps) {
  const t = useT();
  const f = useFormat();
  return (
    <>
      <HeroHeader
        right={
          p.lastValid ? (
            <span className="nowrap pt-2.5 text-sm text-muted">{t.hero.lastValid(f.num(p.lastValid.score), p.lastValid.age)}</span>
          ) : null
        }
      />
      <span className="mt-4 grid h-22 w-22 place-items-center rounded-full bg-track hc:border-2 hc:border-ink">
        <NoSignalIcon className="h-10 w-10 text-text-2" />
      </span>
      <h3 className="mt-7 text-3xl font-bold leading-[38px]">{t.hero.unavailableTitle}</h3>
      <ul className="mt-4 flex flex-col gap-2">
        {p.reasons.map((r) => (
          <li key={r.text} className="flex items-start gap-2.5 text-md leading-6 text-text-2">
            {r.kind === 'rejected' ? (
              <RejectedIcon className="mt-[3px] h-[18px] w-[18px] shrink-0 text-sensor-rejected" />
            ) : (
              <HalfRingIcon className="mt-[3px] h-[18px] w-[18px] shrink-0" />
            )}
            <span>{r.text}</span>
          </li>
        ))}
      </ul>
      <Button size="lg" className="mt-7 self-start" onClick={p.onPerform}>
        <ClipboardList aria-hidden size={20} strokeWidth={1.75} />
        {t.alertSlot.perform}
      </Button>
      <p className="mt-5 text-sm text-muted">{t.hero.staleNote}</p>
    </>
  );
}
