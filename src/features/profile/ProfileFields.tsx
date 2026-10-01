/**
 * Profile field groups shared by the admission wizard and the profile drawer. Tap-first
 * controls (segmented, chips, steppers, relative time); free text only for the optional note.
 * Each clinically relevant field shows its "Effect on ALGOS‑Δ" line (task §3.1-2).
 */
import { useMemo, useState } from 'react';
import { Command } from 'cmdk';
import { Check, ChevronDown, Info } from 'lucide-react';
import * as RP from '@radix-ui/react-popover';
import { ADMISSION, CONDITIONS, FLAGS, MEDICATIONS, type AdmissionCategory, type FlagId } from '@/clinical/clinicalEffects';
import { AIRWAY, CAM, CARE, CARE_MODE, COMMUNICATION, RASS, SEX, SKIN_CONDITION, SKIN_SITE, TEMP_SOURCE } from '@/clinical/options';
import { preferredScale, type Airway, type CamResult, type CareSetting, type Communication, type PatientProfile, type Sex, type SkinCondition, type SkinSite, type TempSource } from '@/clinical/profile';
import { useL10n, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { EffectLine, Field, FieldMessage, Stepper, TextArea } from '@/components/ui/Form';
import { Segmented } from '@/components/ui/Segmented';
import { FlagEffect, TimePick } from '@/features/entry/common';

const H = 3_600_000;

/* --------------------------------------------------------------------- required */

export function SexField({ value, onChange }: { value: Sex | null; onChange: (v: Sex) => void }) {
  const t = useT();
  const l = useL10n();
  return (
    <Field label={t.forms.sex} required>
      <Segmented<Sex> aria-label={t.forms.sex} block value={value} onChange={onChange} options={(Object.keys(SEX) as Sex[]).map((k) => ({ value: k, label: l(SEX[k]) }))} />
    </Field>
  );
}

export function CareField({ value, onChange }: { value: CareSetting; onChange: (v: CareSetting) => void }) {
  const t = useT();
  const l = useL10n();
  return (
    <Field label={t.forms.careSetting} required hint={t.entry.careHint(l(CARE_MODE[value]))}>
      <Segmented<CareSetting> aria-label={t.forms.careSetting} block value={value} onChange={onChange} options={(Object.keys(CARE) as CareSetting[]).map((k) => ({ value: k, label: l(CARE[k]) }))} />
    </Field>
  );
}

export function CommunicationField({ value, airway, onChange }: { value: Communication; airway: Airway; onChange: (v: Communication) => void }) {
  const t = useT();
  const l = useL10n();
  const scale = preferredScale({ communication: value, airway });
  return (
    <Field label={t.entry.communication} required hint={t.entry.communicationHint(scale === 'NRS' ? t.entry.nrs.tab : scale)}>
      <Segmented<Communication>
        aria-label={t.entry.communication}
        block
        value={value}
        onChange={onChange}
        options={(Object.keys(COMMUNICATION) as Communication[]).map((k) => ({ value: k, label: l(COMMUNICATION[k]) }))}
      />
    </Field>
  );
}

export function AirwayField({ value, onChange }: { value: Airway; onChange: (v: Airway) => void }) {
  const t = useT();
  const l = useL10n();
  return (
    <Field label={t.entry.airway} required hint={t.entry.airwayHint}>
      <Segmented<Airway> aria-label={t.entry.airway} block size="sm" value={value} onChange={onChange} options={(Object.keys(AIRWAY) as Airway[]).map((k) => ({ value: k, label: l(AIRWAY[k]) }))} />
      {value === 'controlled' ? <FlagEffect flag="CONTROLLED_VENTILATION" /> : null}
    </Field>
  );
}

export function AgeField({ value, onChange, error }: { value: number | null; onChange: (v: number | null) => void; error?: string }) {
  const t = useT();
  return (
    <Field label={t.forms.age} htmlFor="pf-age" required hint={t.entry.ageHint} error={error}>
      <Stepper id="pf-age" label={t.forms.age} value={value} onChange={onChange} min={0} max={130} invalid={!!error} />
    </Field>
  );
}

/* ------------------------------------------------------------------ recommended */

const SURGERY_PICKS = { lt6: 3, h6to24: 15, d1to3: 48, gt3: 96 } as const;
type SurgeryPick = keyof typeof SURGERY_PICKS | 'none';

function pickFor(surgeryAt: number | null, now: number): SurgeryPick {
  if (surgeryAt === null) return 'none';
  const h = (now - surgeryAt) / H;
  return h < 6 ? 'lt6' : h < 24 ? 'h6to24' : h < 72 ? 'd1to3' : 'gt3';
}

/** Searchable category select + relative time of surgery. Effect: Prior (expected trajectory). */
export function AdmissionField({ value, now, onChange }: { value: PatientProfile['admission']; now: number; onChange: (v: PatientProfile['admission']) => void }) {
  const t = useT();
  const l = useL10n();
  const [open, setOpen] = useState(false);
  const cats = Object.keys(ADMISSION) as AdmissionCategory[];
  const pick = pickFor(value?.surgeryAt ?? null, now);
  const surgical = value && value.category !== 'medical';
  return (
    <Field label={t.entry.admission}>
      <RP.Root open={open} onOpenChange={setOpen}>
        <RP.Trigger asChild>
          <button
            type="button"
            aria-haspopup="listbox"
            className="flex h-13 w-full items-center justify-between rounded-[14px] border-theme border-card-border bg-card px-4 text-left text-md hover:border-muted/60 hc:border-ink"
          >
            <span className={value ? '' : 'text-muted'}>{value ? l(ADMISSION[value.category].label) : t.entry.searchCategory}</span>
            <ChevronDown aria-hidden size={20} strokeWidth={1.75} />
          </button>
        </RP.Trigger>
        <RP.Portal>
          <RP.Content align="start" sideOffset={6} className="z-[60] w-[var(--radix-popover-trigger-width)] rounded-[14px] border-theme border-card-border bg-card p-1.5 shadow-card hc:border-ink">
            <Command label={t.entry.admission} loop>
              <Command.Input autoFocus placeholder={t.entry.searchCategory} className="h-11 w-full rounded-[10px] bg-subtle px-3 text-md outline-none placeholder:text-muted" />
              <Command.List className="mt-1 max-h-[280px] overflow-y-auto">
                <Command.Empty className="px-3 py-3 text-sm text-muted">{t.entry.addContext.noResults}</Command.Empty>
                {cats.map((c) => (
                  <Command.Item
                    key={c}
                    value={c}
                    keywords={[ADMISSION[c].label.en, ADMISSION[c].label.fr]}
                    onSelect={() => {
                      onChange({ category: c, surgeryAt: c === 'medical' ? null : (value?.surgeryAt ?? now - SURGERY_PICKS.h6to24 * H) });
                      setOpen(false);
                    }}
                    className="flex h-10 cursor-pointer items-center gap-2 rounded-[10px] px-3 text-md data-[selected=true]:bg-subtle"
                  >
                    <span className="w-4">{value?.category === c ? <Check aria-hidden size={16} /> : null}</span>
                    {l(ADMISSION[c].label)}
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </RP.Content>
        </RP.Portal>
      </RP.Root>
      {surgical ? (
        <div className="mt-1">
          <p className="mb-1.5 text-sm font-medium">{t.entry.surgeryTime}</p>
          <Segmented<SurgeryPick>
            aria-label={t.entry.surgeryTime}
            size="sm"
            value={pick}
            onChange={(p) => onChange({ category: value.category, surgeryAt: p === 'none' ? null : now - SURGERY_PICKS[p] * H })}
            options={(['lt6', 'h6to24', 'd1to3', 'gt3', 'none'] as SurgeryPick[]).map((p) => ({ value: p, label: t.entry.surgeryPicks[p] }))}
          />
        </div>
      ) : null}
      {value ? (
        <EffectLine route="prior">
          {l(FLAGS.SURGICAL_PRIOR.effect)} ×{ADMISSION[value.category].pain.toFixed(1)}
          {value.surgeryAt !== null && (now - value.surgeryAt) / H > 72 ? ' (> 72 h — faded)' : ''}
        </EffectLine>
      ) : null}
    </Field>
  );
}

/** RASS −5…+4 segmented scale with descriptors + time assessed. */
export function RassField({ value, now, onChange }: { value: PatientProfile['rass']; now: number; onChange: (v: PatientProfile['rass']) => void }) {
  const t = useT();
  const l = useL10n();
  const values = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4];
  const sign = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '0');
  return (
    <Field label={t.entry.rass} hint={t.entry.rassHint}>
      <Segmented<string>
        aria-label={t.entry.rass}
        block
        size="sm"
        value={value ? String(value.value) : null}
        onChange={(v) => onChange({ value: Number(v), at: value?.at ?? now })}
        options={values.map((v) => ({ value: String(v), label: sign(v), description: l(RASS[v] ?? { en: '', fr: '' }) }))}
      />
      {value ? (
        <>
          <p className="text-sm font-medium text-text-2">
            {sign(value.value)} · {l(RASS[value.value] ?? { en: '', fr: '' })}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-text-2">{t.entry.assessedAt}</span>
            <TimePick now={now} value={value.at} onChange={(at) => onChange({ ...value, at })} label={t.entry.assessedAt} />
          </div>
        </>
      ) : null}
    </Field>
  );
}

export function CamField({ value, now, onChange }: { value: PatientProfile['cam']; now: number; onChange: (v: PatientProfile['cam']) => void }) {
  const t = useT();
  const l = useL10n();
  return (
    <Field label={t.entry.cam}>
      <Segmented<CamResult>
        aria-label={t.entry.cam}
        block
        size="sm"
        value={value?.result ?? null}
        onChange={(r) => onChange({ result: r, at: value?.at ?? now })}
        options={(Object.keys(CAM) as CamResult[]).map((k) => ({ value: k, label: l(CAM[k]) }))}
      />
      {value ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-text-2">{t.entry.assessedAt}</span>
          <TimePick now={now} value={value.at} onChange={(at) => onChange({ ...value, at })} label={t.entry.assessedAt} />
        </div>
      ) : null}
      {value?.result === 'hyperactive' ? <FlagEffect flag="CAM_HYPERACTIVE" /> : null}
    </Field>
  );
}

/** Multi-select chips grouped by class; each chip shows its effect line (task §3.2-A). */
export function FlagChips({
  kind,
  selected,
  reviewedNone,
  onToggle,
  onNone,
  now,
  startTimes,
  onStartTime,
}: {
  kind: 'medication' | 'condition';
  selected: FlagId[];
  reviewedNone: boolean;
  onToggle: (f: FlagId) => void;
  onNone: () => void;
  now: number;
  startTimes?: Partial<Record<FlagId, number>>;
  onStartTime?: (f: FlagId, t: number) => void;
}) {
  const t = useT();
  const l = useL10n();
  const ids = kind === 'medication' ? MEDICATIONS : CONDITIONS;
  const label = kind === 'medication' ? t.entry.medications : t.entry.conditions;
  return (
    <Field label={label} hint={kind === 'medication' ? t.entry.medicationsHint : undefined}>
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {ids.map((id) => {
          const on = selected.includes(id);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(id)}
              className={cn(
                'nowrap inline-flex h-10 items-center gap-2 rounded-full border-theme px-3.5 text-base font-medium transition-colors duration-150',
                on ? 'border-pill-active bg-pill-active text-pill-active-fg' : 'border-card-border bg-card hover:bg-subtle hc:border-ink',
              )}
            >
              {on ? <Check aria-hidden size={16} strokeWidth={2.25} /> : null}
              {l(FLAGS[id].label)}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={reviewedNone && selected.length === 0}
          onClick={onNone}
          className={cn(
            'nowrap inline-flex h-10 items-center gap-2 rounded-full border-[1.5px] border-dashed px-3.5 text-base font-medium',
            reviewedNone && selected.length === 0 ? 'border-ink bg-subtle text-ink' : 'border-muted/60 text-text-2 hover:border-ink hc:border-ink',
          )}
        >
          {reviewedNone && selected.length === 0 ? <Check aria-hidden size={16} strokeWidth={2.25} /> : null}
          {t.entry.noneOfThese}
        </button>
      </div>
      {selected.length ? (
        <ul className="mt-1 flex flex-col gap-2.5">
          {selected.map((id) => (
            <li key={id} className="rounded-[12px] bg-subtle/70 px-3 py-2.5 hc:border hc:border-ink hc:bg-card">
              <p className="text-sm font-semibold">
                {l(FLAGS[id].label)}
                {FLAGS[id].examples ? <span className="font-normal text-muted"> · {l(FLAGS[id].examples!)}</span> : null}
              </p>
              <FlagEffect flag={id} className="mt-1" />
              {FLAGS[id].asksStartTime && onStartTime ? (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="text-sm text-text-2">{t.entry.startedAt}</span>
                  <TimePick now={now} value={startTimes?.[id] ?? now} onChange={(ts) => onStartTime(id, ts)} label={t.entry.startedAt} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </Field>
  );
}

/* --------------------------------------------------------------------- optional */

export function CoreTempField({ value, now, onChange, error }: { value: PatientProfile['coreTemp']; now: number; onChange: (v: PatientProfile['coreTemp']) => void; error?: string }) {
  const t = useT();
  const l = useL10n();
  const [tenths, setTenths] = useState<number | null>(value ? Math.round(value.valueC * 10) : null);
  const derived = value && value.valueC >= 38 ? 'FEVER' : value && value.valueC < 35.5 ? 'HYPOTHERMIA' : null;
  return (
    <Field label={t.entry.coreTemp} error={error}>
      <Segmented<TempSource>
        aria-label={t.entry.tempSource}
        size="sm"
        value={value?.source ?? null}
        onChange={(src) => onChange({ source: src, valueC: value?.valueC ?? 37, at: value?.at ?? now })}
        options={(Object.keys(TEMP_SOURCE) as TempSource[]).map((k) => ({ value: k, label: l(TEMP_SOURCE[k]) }))}
      />
      <div className="flex items-center gap-3">
        <Stepper
          label={t.entry.tempValue}
          value={tenths === null ? null : tenths / 10}
          step={0.1}
          min={30}
          max={43}
          invalid={!!error}
          onChange={(v) => {
            const tv = v === null ? null : Math.round(v * 10);
            setTenths(tv);
            if (tv !== null) onChange({ source: value?.source ?? 'bladder', valueC: tv / 10, at: value?.at ?? now });
          }}
        />
        <span className="text-md text-text-2">°C</span>
      </div>
      {derived ? <FlagEffect flag={derived} /> : null}
    </Field>
  );
}

/** Mini silhouette site picker (task §3.2-A step 3): tap a sensor site, then the condition. */
export function SkinField({ value, onChange }: { value: PatientProfile['skin']; onChange: (v: PatientProfile['skin']) => void }) {
  const t = useT();
  const l = useL10n();
  const [site, setSite] = useState<SkinSite>('eda');
  const current = useMemo(() => value.find((s) => s.site === site)?.condition ?? null, [value, site]);
  const sites: { k: SkinSite; x: number; y: number }[] = [
    { k: 'temp', x: 74, y: 112 },
    { k: 'ppg', x: 80, y: 128 },
    { k: 'eda', x: 86, y: 140 },
  ];
  const setCondition = (c: SkinCondition | null) => onChange([...value.filter((s) => s.site !== site), ...(c ? [{ site, condition: c }] : [])]);
  return (
    <Field label={t.entry.skin} hint={t.entry.skinHint}>
      <div className="flex gap-5">
        <svg viewBox="0 0 120 180" className="h-[180px] w-[120px] shrink-0" role="group" aria-label={t.entry.site}>
          <g className="fill-body-fill stroke-body-stroke" strokeWidth="1.5">
            <ellipse cx="60" cy="18" rx="12" ry="14" />
            <path d="M42 36 Q60 30 78 36 L84 92 L36 92 Z" />
            <path d="M42 38 L26 96 L32 98 L46 56 Z" />
            <path d="M78 38 L88 140 L80 142 L74 56 Z" />
            <path d="M40 92 L58 92 L56 172 L44 172 Z" />
            <path d="M62 92 L80 92 L76 172 L64 172 Z" />
          </g>
          {sites.map((s) => {
            const has = value.some((v) => v.site === s.k);
            return (
              <g key={s.k} role="radio" aria-checked={site === s.k} aria-label={l(SKIN_SITE[s.k])} tabIndex={0} onClick={() => setSite(s.k)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSite(s.k)} className="cursor-pointer">
                <circle cx={s.x} cy={s.y} r={site === s.k ? 8 : 6} className={cn(has ? 'fill-sensor-degraded' : 'fill-sensor-ok', site === s.k && 'stroke-ink')} strokeWidth="2" />
              </g>
            );
          })}
        </svg>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Segmented<SkinSite> aria-label={t.entry.site} size="sm" value={site} onChange={setSite} options={(Object.keys(SKIN_SITE) as SkinSite[]).map((k) => ({ value: k, label: l(SKIN_SITE[k]).split(' (')[0] ?? '' }))} />
          <p className="text-sm text-text-2">{l(SKIN_SITE[site])}</p>
          <Segmented<SkinCondition | 'none'>
            aria-label={t.entry.condition}
            size="sm"
            value={current ?? 'none'}
            onChange={(c) => setCondition(c === 'none' ? null : c)}
            options={[{ value: 'none', label: '—' }, ...(Object.keys(SKIN_CONDITION) as SkinCondition[]).map((k) => ({ value: k, label: l(SKIN_CONDITION[k]) }))]}
          />
          {value.length ? (
            <ul className="text-sm">
              {value.map((s) => (
                <li key={s.site}>
                  <FlagEffect flag={s.site === 'eda' ? 'SKIN_EDA_SITE' : s.site === 'ppg' ? 'SKIN_PPG_SITE' : 'SKIN_TEMP_SITE'} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{t.entry.noSkinIssue}</p>
          )}
        </div>
      </div>
    </Field>
  );
}

export function NoteField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const t = useT();
  return (
    <Field label={t.entry.note} htmlFor="pf-note" hint={t.entry.noteHint} error={error}>
      <TextArea id="pf-note" rows={3} maxLength={520} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function SciBanner() {
  const t = useT();
  return (
    <p role="note" className="flex items-start gap-2.5 rounded-[14px] bg-sky px-4 py-3 text-sm font-medium text-ink hc:border-2 hc:border-ink">
      <Info aria-hidden size={18} strokeWidth={1.75} className="mt-0.5 shrink-0" />
      {t.entry.sciBanner}
    </p>
  );
}

export function ErrorText({ k }: { k: string | undefined }) {
  const t = useT();
  if (!k) return null;
  return <FieldMessage>{(t.entry.errors as Record<string, string>)[k] ?? k}</FieldMessage>;
}
