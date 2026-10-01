import { Anchor } from 'lucide-react';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { StatusPill } from '@/components/ui/StatusPill';

export type Mode = 'ICU' | 'WARD';
export type ConnectionKind = 'live' | 'simulator' | 'reconnecting' | 'offline' | 'paused';

/** Connection pill — A8 sheet 4 §09: Live, Simulator, Reconnecting (pulsing amber), Offline (data age). */
export function ConnectionPill({
  kind,
  seconds = 0,
  age = '',
  size = 'md',
}: {
  kind: ConnectionKind;
  seconds?: number;
  age?: string;
  size?: 'sm' | 'md';
}) {
  const t = useT();
  const text =
    kind === 'live'
      ? t.connection.live
      : kind === 'simulator'
        ? t.connection.simulator
        : kind === 'reconnecting'
          ? t.connection.reconnecting(seconds)
          : kind === 'paused'
            ? t.connection.paused
            : t.connection.offline(age);
  const dot = kind === 'reconnecting' ? 'pending' : kind === 'offline' || kind === 'paused' ? 'offline' : 'ok';
  return (
    <StatusPill size={size} dot={dot}>
      {text}
    </StatusPill>
  );
}

export type BaselineState = 'calibrating' | 'adaptive' | 'frozen' | 'recalibration';

/** "⚓ Baseline: adaptive" — value in bold. Quality (Good / Provisional) is appended in Phase 3 (D-13). */
export function BaselinePill({ state, provisional }: { state: BaselineState; provisional?: boolean }) {
  const t = useT();
  const value = { calibrating: t.baseline.calibrating, adaptive: t.baseline.adaptive, frozen: t.baseline.frozen, recalibration: t.baseline.recalibration }[state];
  return (
    <span className="nowrap inline-flex h-10 items-center gap-2 rounded-full border-theme border-card-border bg-card px-3.5 text-base text-text-2 hc:border-ink hc:text-ink">
      <Anchor aria-hidden size={17} strokeWidth={1.75} className="text-ink" />
      <span>
        {t.baseline.pill}{' '}
        <span className={cn('font-semibold text-ink', state === 'recalibration' && 'text-advisory-text hc:text-advisory-border')}>{value}</span>
        {provisional ? <span className="font-semibold text-advisory-text hc:text-advisory-border"> · {t.baseline.provisional}</span> : null}
      </span>
    </span>
  );
}

/** ICU | Ward segmented + rule text (A1/A10). Activation is routed through `onRequest` so the
 *  screen can show the confirmation popover first (D-26); the control never switches by itself. */
export function ModeControl({ mode, onRequest, showRule = true }: { mode: Mode; onRequest: (m: Mode) => void; showRule?: boolean }) {
  const t = useT();
  return (
    <div className="flex items-center gap-3">
      <Segmented<Mode>
        aria-label={`${t.mode.icu} / ${t.mode.ward}`}
        value={mode}
        onChange={(m) => {
          if (m !== mode) onRequest(m);
        }}
        options={[
          { value: 'ICU', label: t.mode.icu },
          { value: 'WARD', label: t.mode.ward },
        ]}
      />
      {showRule ? (
        <p className="w-[150px] text-[13px] leading-4 text-text-2">{mode === 'ICU' ? t.mode.icuRule : t.mode.wardRule}</p>
      ) : null}
    </div>
  );
}

/** Mode confirmation content (A10 / A8 sheet 3). States the new alert rule in plain language. */
export function ModeConfirmBody({ target, onCancel, onConfirm }: { target: Mode; onCancel: () => void; onConfirm: () => void }) {
  const t = useT();
  return (
    <div>
      <h3 className="nowrap text-2xl font-bold">{target === 'WARD' ? t.mode.switchToWard : t.mode.switchToIcu}</h3>
      <p className="mt-3 text-md leading-6 text-text-2">{target === 'WARD' ? t.mode.wardExplain : t.mode.icuExplain}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" size="lg" onClick={onCancel}>
          {t.common.cancel}
        </Button>
        <Button size="lg" onClick={onConfirm}>
          {t.mode.switchMode}
        </Button>
      </div>
    </div>
  );
}
