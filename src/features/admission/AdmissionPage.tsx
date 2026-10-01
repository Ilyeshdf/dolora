import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, RefreshCw } from 'lucide-react';
import { FLAGS, type FlagId } from '@/clinical/clinicalEffects';
import { contradictions, emptyProfile, generatePatientRef, preferredScale, requiredSchema, type PatientProfile, type RefScale, type RequiredProfile } from '@/clinical/profile';
import { SCALES } from '@/clinical/scales';
import { deriveEffects, type ContextEntry } from '@/engine/effects';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { useClinical } from '@/store/clinical';
import { useMonitor } from '@/store/monitor';
import { toast } from '@/components/ui/toastStore';
import { Footer, Wordmark } from '@/components/ui/Brand';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Select, TextInput } from '@/components/ui/Form';
import { EffectChips, EffectsSummary, RuleWarnings, Tier, TimePick } from '@/features/entry/common';
import { useCompact } from '@/features/monitor/useCompact';
import {
  AdmissionField,
  AgeField,
  AirwayField,
  CamField,
  CareField,
  CommunicationField,
  CoreTempField,
  ErrorText,
  FlagChips,
  NoteField,
  RassField,
  SciBanner,
  SexField,
  SkinField,
} from '@/features/profile/ProfileFields';

const BEDS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const CALIBRATION_S = 90; // D-10 (configurable in Settings, Phase 4)
type Step = 0 | 1 | 2 | 3;

/**
 * Admission wizard (task §3.2-A). Only step 1 blocks monitoring; steps 2–3 are skippable and
 * leave an amber "Profile incomplete" badge. The interpretation summary lists every effect by
 * route before calibration starts.
 */
export function AdmissionPage() {
  const t = useT();
  const navigate = useNavigate();
  const compact = useCompact();
  const { bedId = '9' } = useParams();
  const now = useMonitor((s) => s.now);
  const [step, setStep] = useState<Step>(0);
  const [draft, setDraft] = useState<PatientProfile>(() => ({ ...emptyProfile(bedId, generatePatientRef()), sex: 'unknown' }));
  const [flags, setFlags] = useState<{ flag: FlagId; startedAt: number }[]>([]);
  const [reference, setReference] = useState<{ scale: RefScale; value: number; t: number } | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const form = useForm<RequiredProfile>({
    resolver: zodResolver(requiredSchema),
    mode: 'onTouched',
    defaultValues: { patientRef: draft.patientRef, bedId, ageYears: undefined as unknown as number, sex: 'unknown', careSetting: 'ICU', communication: 'none', airway: 'none' },
  });
  const req = useWatch({ control: form.control }) as RequiredProfile;

  const profile: PatientProfile = useMemo(
    () => ({ ...draft, ...req, ageYears: req.ageYears, medsReviewed: draft.medsReviewed || flags.some((f) => FLAGS[f.flag].kind === 'medication'), conditionsReviewed: draft.conditionsReviewed || flags.some((f) => FLAGS[f.flag].kind === 'condition') }),
    [draft, req, flags],
  );
  const context: ContextEntry[] = flags.map((f, i) => ({ id: `draft-${i}`, flag: f.flag, startedAt: f.startedAt, enteredAt: now, by: '' }));
  const effects = deriveEffects({ profile, context, events: [], now });
  const rules = contradictions({ communication: profile.communication, airway: profile.airway, careSetting: profile.careSetting, rass: profile.rass?.value ?? null, flags: effects.active.map((a) => a.flag) });
  const blocked = rules.some((r) => r.severity === 'block');
  const needsConfirm = rules.some((r) => r.severity === 'confirm') && !confirmed;
  const set = (patch: Partial<PatientProfile>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setConfirmed(false);
  };
  const toggleFlag = (f: FlagId) => {
    setFlags((xs) => (xs.some((x) => x.flag === f) ? xs.filter((x) => x.flag !== f) : [...xs, { flag: f, startedAt: now }]));
    setConfirmed(false);
  };

  const next = async () => {
    if (step === 0) {
      const ok = await form.trigger();
      if (!ok) return;
    }
    setStep((s) => Math.min(3, s + 1) as Step);
  };

  const start = () => {
    if (blocked || needsConfirm) return;
    useClinical.getState().admit(
      bedId,
      profile,
      { context: flags, reference: reference ? { scale: reference.scale, value: reference.value, items: null, t: reference.t, note: '' } : null },
      now,
      CALIBRATION_S,
    );
    toast({ title: t.entry.toasts.admitted(profile.patientRef) });
    navigate(`/bed/${bedId}/monitor`);
  };

  const steps = [t.entry.steps.required, t.entry.steps.recommended, t.entry.steps.optional, t.entry.steps.summary];
  const sci = effects.active.some((a) => a.flag === 'SCI_T6_OR_ABOVE');
  const scale = preferredScale(profile);
  const s = SCALES[scale];

  return (
    <div className={cn('themed-page flex min-h-dvh flex-col', compact && 'compact')}>
      <header className="flex h-18 items-center gap-6 px-8">
        <Wordmark />
        <div>
          <h1 className="text-2xl font-bold">{t.entry.admitTitle}</h1>
          <p className="text-sm text-text-2">{t.entry.admitSub(bedId)}</p>
        </div>
      </header>

      <nav aria-label={t.entry.admitTitle} className="px-8 pt-2">
        <ol className="flex items-center gap-3">
          {steps.map((label, i) => (
            <li key={label} className="flex items-center gap-3">
              <span
                aria-current={i === step ? 'step' : undefined}
                className={cn(
                  'nowrap inline-flex h-10 items-center gap-2 rounded-full px-4 text-base font-semibold',
                  i === step ? 'bg-pill-active text-pill-active-fg' : i < step ? 'bg-card text-ink hc:border-2 hc:border-ink' : 'bg-card text-muted hc:border hc:border-ink',
                )}
              >
                {i < step ? <Check aria-hidden size={16} strokeWidth={2.5} /> : <span className="tabular">{i + 1}</span>}
                {label}
                {i === 1 || i === 2 ? <span className="text-xs font-medium opacity-70">· {t.entry.skippable}</span> : null}
              </span>
              {i < steps.length - 1 ? <span aria-hidden className="h-px w-8 bg-card-border hc:bg-ink" /> : null}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-sm text-text-2">{t.entry.stepOf(step + 1, 4)}</p>
      </nav>

      <main className="grid flex-1 grid-cols-[minmax(0,1fr)_380px] gap-6 px-8 py-6 compact:grid-cols-1">
        <Card className="min-w-0">
          {step === 0 ? (
            <form
              className="flex flex-col gap-6"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                void next();
              }}
            >
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">{t.entry.steps.required}</h2>
                <Tier tier="required">{t.entry.blocks}</Tier>
              </div>
              <div className="grid grid-cols-2 gap-6 compact:grid-cols-1">
                <Field label={t.forms.patientId} htmlFor="ad-ref" required hint={t.entry.idHint}>
                  <TextInput
                    id="ad-ref"
                    {...form.register('patientRef', { setValueAs: (v: string) => v.toUpperCase().trim() })}
                    invalid={!!form.formState.errors.patientRef}
                    trailing={
                      <button type="button" aria-label={t.entry.regenerate} onClick={() => form.setValue('patientRef', generatePatientRef(), { shouldValidate: true })} className="grid h-9 w-9 place-items-center rounded-full hover:bg-subtle">
                        <RefreshCw aria-hidden size={16} />
                      </button>
                    }
                  />
                  <ErrorText k={form.formState.errors.patientRef?.message} />
                </Field>
                <Field label={t.entry.bed} htmlFor="ad-bed" required>
                  <Controller
                    control={form.control}
                    name="bedId"
                    render={({ field }) => <Select id="ad-bed" value={field.value} onValueChange={field.onChange} options={BEDS.map((b) => ({ value: b, label: t.entry.bedOption(b) }))} />}
                  />
                </Field>
              </div>
              <Controller
                control={form.control}
                name="ageYears"
                render={({ field, fieldState }) => (
                  <AgeField
                    value={Number.isFinite(field.value) ? field.value : null}
                    onChange={(v) => {
                      field.onChange(v ?? (NaN as unknown as number));
                      void form.trigger('ageYears');
                    }}
                    error={fieldState.error ? (t.entry.errors as Record<string, string>)[fieldState.error.message ?? 'age'] : undefined}
                  />
                )}
              />
              <Controller control={form.control} name="sex" render={({ field }) => <SexField value={field.value} onChange={field.onChange} />} />
              <Controller control={form.control} name="careSetting" render={({ field }) => <CareField value={field.value} onChange={field.onChange} />} />
              <Controller control={form.control} name="communication" render={({ field }) => <CommunicationField value={field.value} airway={req.airway} onChange={field.onChange} />} />
              <Controller control={form.control} name="airway" render={({ field }) => <AirwayField value={field.value} onChange={field.onChange} />} />
              <RuleWarnings items={rules.filter((r) => r.id === 'WARD_CONTROLLED_VENTILATION')} />
              <WizardNav onNext={() => void next()} nextLabel={t.entry.next} disabled={false} />
            </form>
          ) : null}

          {step === 1 ? (
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">{t.entry.steps.recommended}</h2>
                <Tier tier="recommended">{t.entry.nonBlocking}</Tier>
              </div>
              {sci ? <SciBanner /> : null}
              <AdmissionField value={draft.admission} now={now} onChange={(v) => set({ admission: v })} />
              <RassField value={draft.rass} now={now} onChange={(v) => set({ rass: v })} />
              <CamField value={draft.cam} now={now} onChange={(v) => set({ cam: v })} />
              <Field label={t.entry.reference} hint={t.entry.referenceHint}>
                <p className="text-sm font-medium">{scale === 'NRS' ? t.entry.nrs.quick : scale}</p>
                <div role="radiogroup" aria-label={t.entry.reference} className="flex flex-wrap gap-2">
                  {Array.from({ length: s.max - s.min + 1 }, (_, i) => s.min + i).map((v) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={reference?.value === v && reference.scale === scale}
                      onClick={() => setReference({ scale, value: v, t: reference?.t ?? now })}
                      className={cn(
                        'grid h-11 w-11 place-items-center rounded-full border-theme text-md font-semibold',
                        reference?.value === v && reference.scale === scale ? 'border-pill-active bg-pill-active text-pill-active-fg' : 'border-card-border bg-card hover:bg-subtle hc:border-ink',
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                {reference ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-text-2">{t.entry.assessedAt}</span>
                    <TimePick now={now} value={reference.t} onChange={(ts) => setReference({ ...reference, t: ts })} label={t.entry.assessedAt} />
                  </div>
                ) : null}
              </Field>
              <FlagChips
                kind="medication"
                selected={flags.filter((f) => FLAGS[f.flag].kind === 'medication').map((f) => f.flag)}
                reviewedNone={draft.medsReviewed}
                onToggle={toggleFlag}
                onNone={() => {
                  setFlags((xs) => xs.filter((x) => FLAGS[x.flag].kind !== 'medication'));
                  set({ medsReviewed: true });
                }}
                now={now}
                startTimes={Object.fromEntries(flags.map((f) => [f.flag, f.startedAt]))}
                onStartTime={(f, ts) => setFlags((xs) => xs.map((x) => (x.flag === f ? { ...x, startedAt: ts } : x)))}
              />
              <FlagChips
                kind="condition"
                selected={flags.filter((f) => FLAGS[f.flag].kind === 'condition').map((f) => f.flag)}
                reviewedNone={draft.conditionsReviewed}
                onToggle={toggleFlag}
                onNone={() => {
                  setFlags((xs) => xs.filter((x) => FLAGS[x.flag].kind !== 'condition'));
                  set({ conditionsReviewed: true });
                }}
                now={now}
              />
              <RuleWarnings items={rules} onConfirm={() => setConfirmed(true)} onCancel={() => undefined} />
              <WizardNav onBack={() => setStep(0)} onSkip={() => setStep(2)} onNext={() => setStep(2)} nextLabel={t.entry.next} disabled={blocked} />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">{t.entry.steps.optional}</h2>
                <Tier tier="optional">{t.entry.nonBlocking}</Tier>
              </div>
              <CoreTempField value={draft.coreTemp} now={now} onChange={(v) => set({ coreTemp: v })} />
              <SkinField value={draft.skin} onChange={(v) => set({ skin: v })} />
              <NoteField value={draft.note} onChange={(v) => set({ note: v })} error={draft.note.length > 500 ? t.entry.errors.noteTooLong : undefined} />
              <RuleWarnings items={rules} onConfirm={() => setConfirmed(true)} onCancel={() => undefined} />
              <WizardNav onBack={() => setStep(1)} onSkip={() => setStep(3)} onNext={() => setStep(3)} nextLabel={t.entry.next} disabled={blocked} />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-2xl font-bold">{t.entry.summaryTitle}</h2>
                <p className="mt-1 text-md text-text-2">{t.entry.summarySub}</p>
              </div>
              <EffectsSummary effects={effects} />
              <RuleWarnings items={rules} onConfirm={() => setConfirmed(true)} onCancel={() => setStep(1)} />
              <p className="text-sm text-text-2">{t.entry.calibrationHint(CALIBRATION_S)}</p>
              <WizardNav onBack={() => setStep(2)} onNext={start} nextLabel={t.entry.startCalibration} disabled={blocked || needsConfirm} primary />
            </div>
          ) : null}
        </Card>

        <aside aria-label={t.entry.effectsNow} className="flex flex-col gap-4 compact:hidden">
          <Card padding="md">
            <h2 className="text-lg font-semibold">{t.entry.effectsNow}</h2>
            <p className="mt-0.5 font-bold tabular">{profile.patientRef}</p>
            <div className="mt-3">
              <EffectChips effects={effects} />
            </div>
          </Card>
        </aside>
      </main>
      <Footer className="h-[41px]" />
    </div>
  );
}

function WizardNav({ onBack, onSkip, onNext, nextLabel, disabled, primary }: { onBack?: () => void; onSkip?: () => void; onNext: () => void; nextLabel: string; disabled: boolean; primary?: boolean }) {
  const t = useT();
  return (
    <div className="flex items-center gap-3 border-t border-card-border pt-5 hc:border-ink">
      {onBack ? (
        <Button variant="ghost" size="lg" onClick={onBack}>
          {t.entry.back}
        </Button>
      ) : null}
      <span className="flex-1" />
      {onSkip ? (
        <Button variant="link" size="lg" onClick={onSkip}>
          {t.entry.skip}
        </Button>
      ) : null}
      <Button size="lg" type={onBack ? 'button' : 'submit'} onClick={onBack ? onNext : undefined} disabled={disabled} className={primary ? 'px-8' : undefined}>
        {nextLabel}
      </Button>
    </div>
  );
}
