import { useState } from 'react';
import * as RD from '@radix-ui/react-dialog';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, ChevronUp, CircleCheck, Info, X } from 'lucide-react';
import { useFormat, useL10n, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { fmtTime } from '@/lib/time';
import { useMonitor } from '@/store/monitor';
import { toast } from '@/components/ui/toastStore';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FieldMessage, Switch, TextInput } from '@/components/ui/Form';
import { Segmented } from '@/components/ui/Segmented';
import { SCALES, painLikely, scaleItems, type ScaleId } from '@/clinical/scales';
import { assessmentSchema, emptyAssessment, itemsTotal, type AssessmentForm } from '@/contracts/assessment';

/**
 * CPOT / BPS dialog — A5 (§7.6, D-21). The clinician's entry is the reference; the ALGOS‑Δ
 * estimate is shown muted "for reference only". react-hook-form + zod; validation in amber.
 * `prefill` reproduces the A5 artboard state (fixture only).
 */
export function AssessmentDialog({ prefill }: { prefill?: boolean }) {
  const t = useT();
  const open = useMonitor((s) => s.dialog === 'assessment');
  const setDialog = useMonitor((s) => s.setDialog);
  return (
    <RD.Root open={open} onOpenChange={(o) => setDialog(o ? 'assessment' : null)}>
      <RD.Portal>
        <RD.Overlay className="fixed inset-0 z-40 bg-scrim/40" />
        <RD.Content
          aria-describedby="assess-desc"
          className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-32px)] w-[880px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-dialog border-theme border-card-outline bg-card px-10 pb-9 pt-10 shadow-card compact:px-7 compact:py-6"
        >
          {open ? <AssessmentBody prefill={prefill} /> : null}
          <RD.Close asChild>
            <Button variant="icon" size="icon" aria-label={t.common.close} className="absolute right-10 top-9 compact:right-7 compact:top-6">
              <X aria-hidden size={20} strokeWidth={1.75} />
            </Button>
          </RD.Close>
        </RD.Content>
      </RD.Portal>
    </RD.Root>
  );
}

function AssessmentBody({ prefill }: { prefill?: boolean }) {
  const t = useT();
  const l = useL10n();
  const f = useFormat();
  const view = useMonitor((s) => s.view);
  const save = useMonitor((s) => s.saveAssessment);
  const nmb = view.context.some((c) => c.flag === 'NMB');
  // Item 3 follows the airway: ventilated (or paralysed) → ventilator compliance (§7.6).
  const intubatedDefault = view.context.some((c) => c.flag === 'CONTROLLED_VENTILATION' || c.flag === 'NMB');
  const [expanded, setExpanded] = useState(true);

  const initial = prefill ? { ...emptyAssessment('CPOT', true), items: [1, 1, 1, 1], total: 4 } : emptyAssessment('CPOT', intubatedDefault);
  const { control, handleSubmit, setValue, reset, formState } = useForm<AssessmentForm>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: initial,
    mode: 'onSubmit',
  });
  const scale = useWatch({ control, name: 'scale' }) as ScaleId;
  const intubated = useWatch({ control, name: 'intubated' });
  const total = useWatch({ control, name: 'total' });
  const items = useWatch({ control, name: 'items' });
  const s = SCALES[scale];
  const list = scaleItems(scale, intubated);

  const setItem = (i: number, v: number) => {
    const next = [...items];
    next[i] = v;
    setValue('items', next, { shouldValidate: formState.isSubmitted });
    setValue('total', itemsTotal(next), { shouldValidate: formState.isSubmitted });
  };
  const setQuick = (v: number) => {
    setValue('total', v, { shouldValidate: formState.isSubmitted });
    setValue('items', Array(list.length).fill(null), { shouldValidate: formState.isSubmitted });
  };

  const onSubmit = (v: AssessmentForm) => {
    if (v.total === null) return;
    save({ scale: v.scale, total: v.total, items: v.items.every((i) => i !== null) ? (v.items as number[]) : null, note: v.note.trim() });
    toast({ title: t.toast.referenceRecorded, description: t.toast.recordedDetail(v.scale, v.total, SCALES[v.scale].max) });
  };

  const errKey = (formState.errors.total?.message ?? formState.errors.items?.message ?? formState.errors.note?.message) as
    | keyof typeof t.assessment.errors
    | undefined;
  const quickValues = Array.from({ length: s.max - s.min + 1 }, (_, i) => s.min + i);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <RD.Title className="nowrap pr-16 text-[34px] font-bold leading-[42px]">{t.assessment.title}</RD.Title>
      <RD.Description id="assess-desc" className="nowrap mt-1.5 text-md text-text-2">
        {t.assessment.description}
      </RD.Description>

      <div className="mt-5 flex items-center justify-between gap-4">
        <Controller
          control={control}
          name="scale"
          render={({ field }) => (
            <Segmented<ScaleId>
              aria-label={t.assessment.scale}
              size="lg"
              value={field.value as ScaleId}
              onChange={(v) => {
                reset(emptyAssessment(v, intubated));
              }}
              options={[
                { value: 'CPOT', label: 'CPOT' },
                { value: 'BPS', label: 'BPS' },
              ]}
            />
          )}
        />
        <p className="nowrap text-sm text-muted">{t.assessment.meta(view.patient.ref, view.patient.bed, fmtTime(view.timeline.now, false))}</p>
      </div>

      {nmb ? (
        <p className="mt-4 flex items-center gap-2 rounded-[12px] bg-advisory-fill px-4 py-2.5 text-sm font-medium text-advisory-text hc:border-2 hc:border-advisory-border">
          <Info aria-hidden size={16} strokeWidth={1.75} />
          {t.assessment.nmbNote}
        </p>
      ) : null}

      {/* quick entry */}
      <div className="mt-6 flex items-center gap-6 border-b border-card-border pb-6 hc:border-ink">
        <div className="w-[190px] shrink-0">
          <p id="quick-label" className="nowrap text-md font-medium">
            {t.assessment.quickEntry}
          </p>
          <p className="nowrap text-sm text-muted">{t.assessment.quickSub}</p>
        </div>
        <div role="radiogroup" aria-labelledby="quick-label" className="flex flex-wrap gap-2.5">
          {quickValues.map((v) => {
            const on = total === v;
            return (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setQuick(v)}
                className={cn(
                  'grid h-12 w-12 place-items-center rounded-full border-theme text-lg font-semibold transition-colors duration-150',
                  on ? 'border-pill-active bg-pill-active text-pill-active-fg' : 'border-card-border bg-card hover:bg-subtle hc:border-ink',
                )}
              >
                {v}
              </button>
            );
          })}
        </div>
      </div>

      {/* full scale */}
      <div className="pt-4">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="full-scale"
          onClick={() => setExpanded((e) => !e)}
          className="nowrap flex items-center gap-2 rounded-full py-1 pr-2 text-left"
        >
          {expanded ? <ChevronUp aria-hidden size={18} /> : <ChevronDown aria-hidden size={18} />}
          <span className="text-lg font-semibold">{t.assessment.fullScale}</span>
          <span className="ml-2 text-sm text-muted">{t.assessment.itemsHint(list.length, s.itemMin, s.itemMax)}</span>
        </button>
        {expanded ? (
          <div id="full-scale" className="mt-3 flex flex-col gap-3">
            {list.map((item, i) => {
              const labelId = `item-${item.id}`;
              const third = i === 2;
              return (
                <div key={item.id} className="flex items-center gap-6">
                  <div className="w-[190px] shrink-0">
                    <p id={labelId} className="text-md font-medium leading-6">
                      {l(item.label)}
                    </p>
                    {third ? (
                      <label className="mt-1.5 flex items-center gap-2 text-xs leading-4 text-text-2">
                        <Controller
                          control={control}
                          name="intubated"
                          render={({ field }) => (
                            <Switch
                              checked={field.value}
                              onCheckedChange={(v) => {
                                field.onChange(v);
                                const next = [...items];
                                next[2] = null;
                                setValue('items', next);
                                setValue('total', null);
                              }}
                              aria-label={t.forms.intubated}
                            />
                          )}
                        />
                        <span>{t.forms.intubated}</span>
                      </label>
                    ) : null}
                  </div>
                  <ItemOptions labelledBy={labelId} options={item.options.map((o) => ({ score: o.score, label: l(o.label) }))} value={items[i] ?? null} onChange={(v) => setItem(i, v)} />
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* total, note */}
      <div className="mt-5 grid grid-cols-[1fr_486px] items-end gap-6 border-t border-card-border pt-5 hc:border-ink">
        <div className="flex items-end gap-4" aria-live="polite">
          <p className="nowrap flex items-baseline gap-2">
            <span className="text-md font-medium">{t.assessment.total}</span>
            <span className="text-[44px] font-bold leading-none">{total ?? '—'}</span>
            <span className="text-xl text-text-2">/ {s.max}</span>
          </p>
          {total !== null ? (
            painLikely(scale, total) ? (
              <Badge tone="advisory" size="lg" className="mb-1" icon={<Info aria-hidden size={16} strokeWidth={1.75} />}>
                {t.assessment.painLikely(s.threshold)}
              </Badge>
            ) : (
              <Badge tone="neutral" size="lg" className="mb-1">
                {t.assessment.below(s.threshold)}
              </Badge>
            )
          ) : null}
        </div>
        <div>
          <label htmlFor="assess-note" className="nowrap mb-2 block text-base font-medium">
            {t.forms.note}
          </label>
          <Controller control={control} name="note" render={({ field }) => <TextInput id="assess-note" placeholder={t.forms.notePlaceholder} maxLength={300} {...field} />} />
        </div>
      </div>

      {errKey ? (
        <div className="mt-3">
          <FieldMessage>{t.assessment.errors[errKey]}</FieldMessage>
        </div>
      ) : null}

      <div className="mt-6 flex items-center gap-6">
        <p className="flex min-w-0 flex-1 items-start gap-2 text-sm text-muted">
          <Info aria-hidden size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          {view.pain ? t.assessment.reference(f.num(view.pain.score), f.num(view.pain.lo), f.num(view.pain.hi)) : t.assessment.noEstimate}
        </p>
        <RD.Close asChild>
          <Button variant="ghost" size="lg" className="h-[52px] px-6">
            {t.common.cancel}
          </Button>
        </RD.Close>
        <Button type="submit" size="lg" className="h-[52px] px-6">
          <CircleCheck aria-hidden size={20} strokeWidth={1.75} />
          {t.assessment.save}
        </Button>
      </div>
    </form>
  );
}

/** Option row: 3 (CPOT) or 4 (BPS) choice cards with the score disc on the right (A5). */
function ItemOptions({
  labelledBy,
  options,
  value,
  onChange,
}: {
  labelledBy: string;
  options: { score: number; label: string }[];
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid flex-1 gap-1.5 rounded-[16px] bg-subtle p-1.5 hc:border hc:border-ink hc:bg-card" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const on = value === o.score;
        return (
          <button
            key={o.score}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`${o.label} (${o.score})`}
            onClick={() => onChange(o.score)}
            onKeyDown={(e) => {
              const i = options.findIndex((x) => x.score === (value ?? options[0]?.score));
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                const n = options[(i + 1) % options.length];
                if (n) onChange(n.score);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                const n = options[(i - 1 + options.length) % options.length];
                if (n) onChange(n.score);
              }
            }}
            className={cn(
              'flex min-h-[52px] items-center justify-between gap-2 rounded-[12px] px-3.5 text-left text-sm leading-[18px] transition-colors duration-150',
              on ? 'bg-pill-active font-semibold text-pill-active-fg' : 'bg-card text-ink hover:bg-subtle hc:border hc:border-ink/50',
            )}
          >
            <span>{o.label}</span>
            <span
              className={cn(
                'grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold',
                on ? 'bg-pill-active-fg text-pill-active' : 'bg-track text-text-2 hc:border hc:border-ink',
              )}
            >
              {o.score}
            </span>
          </button>
        );
      })}
    </div>
  );
}
