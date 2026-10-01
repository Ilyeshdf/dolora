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

export type PainHeroCardProps = (HeroOkProps | HeroAbstainProps) & {
  className?: string;
  compact?: boolean;
  /** Latest clinician reference, e.g. "Last CPOT 4 · 3 min ago" (D-9). */
  lastReference?: string | null;
};

/** Pain hero card — A8 sheet 1 §01 (ok mild/moderate/severe, degraded, rejected, FR). */
export function PainHeroCard(props: PainHeroCardProps) {
  const t = useT();
  return (
    <Card padding="none" className={cn('flex flex-col px-8 pb-5 pt-8 hc:pb-3 hc:pt-6 compact:px-5 compact:pb-3 compact:pt-4', props.className)}>
      {props.state === 'ok' ? <HeroOk {...props} /> : <HeroAbstain {...props} />}
      <span className="sr-only">{t.hero.estimatedPain}</span>
    </Card>
  );
}

function HeroHeader({ right }: { right: ReactNode }) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 compact:gap-y-0">
      <h2 className="nowrap pt-2 text-xl font-semibold">{t.hero.estimatedPain}</h2>
      {right}
    </div>
  );
}

function HeroOk(p: HeroOkProps & { compact?: boolean; lastReference?: string | null }) {
  const t = useT();
  const f = useFormat();
  const sev = severityOf(p.score);
  const TrendIcon = p.trend.direction === 'rising' ? ArrowUp : p.trend.direction === 'falling' ? ArrowDown : ArrowRight;

  return (
    <>
      <HeroHeader right={<SeverityPill severity={sev} />} />
      <p className={cn('mt-1 flex items-baseline font-bold tracking-[-0.03em]', p.compact ? 'text-[80px] leading-[72px]' : 'text-hero')}>
        <span className="transition-opacity duration-150">{f.num(p.score)}</span>
        <span className="ml-1 text-hero-unit font-normal tracking-normal text-text-2 compact:text-2xl">{t.hero.outOf10}</span>
      </p>

      <ScaleBar className="mt-6 compact:mt-3" score={p.score} lo={p.lo} hi={p.hi} />

      {p.notAttributed ? (
        <Badge tone="neutral" size="md" className="mt-3 self-start compact:mt-2 compact:h-auto compact:whitespace-normal compact:py-1 compact:text-sm" icon={<Info aria-hidden size={18} strokeWidth={1.75} className="shrink-0" />}>
          {t.hero.notAttributed}
        </Badge>
      ) : null}

      <div className="mt-3.5 flex items-center gap-3 text-md compact:mt-2 compact:text-base">
        <span aria-hidden className="h-2.5 w-6 rounded-full bg-band" />
        <span className="nowrap shrink-0 text-text-2">{t.scale.interval80}</span>
        {p.degraded ? <span className="nowrap min-w-0 truncate text-sm text-muted compact:hidden">· {t.scale.wider}</span> : null}
        <span className="nowrap ml-auto shrink-0 font-bold">
          {f.num(p.lo)} – {f.num(p.hi)}
        </span>
      </div>

      {p.degraded ? (
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

      {!p.degraded && p.coverageNotValidated ? (
        <Badge tone="advisory" size="sm" className="mt-3 self-start compact:mt-2" icon={<Info aria-hidden size={14} strokeWidth={1.75} />}>
          {t.hero.coverageNotValidated}
        </Badge>
      ) : null}

      {!p.degraded ? (
        <div className="mt-auto border-t border-card-border pt-3 hc:border-ink compact:pt-2">
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
          <p className="nowrap mt-1.5 text-sm text-text-2">
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

function HeroAbstain(p: HeroAbstainProps & { lastReference?: string | null }) {
  const t = useT();
  const f = useFormat();
  return (
    <>
      <HeroHeader
        right={
          p.lastValid ? (
            <span className="nowrap pt-2.5 text-sm text-muted compact:pt-0">{t.hero.lastValid(f.num(p.lastValid.score), p.lastValid.age)}</span>
          ) : null
        }
      />
      <span className="mt-3 grid h-14 w-14 shrink-0 place-items-center rounded-full bg-track hc:border-2 hc:border-ink compact:hidden">
        <NoSignalIcon className="h-8 w-8 text-text-2" />
      </span>
      <h3 className="mt-4 text-3xl font-bold leading-[36px] compact:mt-4 compact:text-2xl">{t.hero.unavailableTitle}</h3>
      <ul className="mt-4 flex flex-col gap-2">
        {p.reasons.map((r) => (
          <li key={r.text} className="flex items-start gap-2.5 text-base leading-[22px] text-text-2">
            {r.kind === 'rejected' ? (
              <RejectedIcon className="mt-[3px] h-[18px] w-[18px] shrink-0 text-sensor-rejected" />
            ) : (
              <HalfRingIcon className="mt-[3px] h-[18px] w-[18px] shrink-0" />
            )}
            <span>{r.text}</span>
          </li>
        ))}
      </ul>
      {p.lastReference ? <p className="nowrap mt-2.5 text-sm font-medium text-ink">{p.lastReference}</p> : null}
      <Button size="lg" className="mt-5 shrink-0 self-start compact:mt-3 compact:h-11" onClick={p.onPerform}>
        <ClipboardList aria-hidden size={20} strokeWidth={1.75} />
        {t.alertSlot.perform}
      </Button>
      <p className="mt-2.5 text-sm text-muted compact:mt-2">{t.hero.staleNote}</p>
    </>
  );
}
