import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ClipboardList } from 'lucide-react';
import { FLAGS, flagLabel, type FlagId } from '@/clinical/clinicalEffects';
import { REMOVAL } from '@/clinical/options';
import { isStale, noteSchema, preferredScale, requiredSchema, type Contradiction, type PatientProfile } from '@/clinical/profile';
import type { RemovalReason } from '@/engine/effects';
import { useL10n, useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { ageParts, fmtTime } from '@/lib/time';
import { useClinical } from '@/store/clinical';
import { useMonitor } from '@/store/monitor';
import { useView } from '@/features/monitor/useView';
import { Button } from '@/components/ui/Button';
import { FreshnessTag } from '@/components/ui/Form';
import { RightDrawer } from '@/components/ui/Overlay';
import { ModeConfirmBody } from '@/components/clinical/HeaderPills';
import { EffectChips, RuleWarnings, Tier } from '@/features/entry/common';
import { checkFlagAdd, checkProfilePatch, useBedActions } from '@/features/entry/useBedActions';
import {
  AdmissionField,
  AgeField,
  AirwayField,
  CamField,
  CareField,
  CommunicationField,
  CoreTempField,
  FlagChips,
  NoteField,
  RassField,
  SciBanner,
  SexField,
  SkinField,
} from './ProfileFields';

type SectionId = 'identity' | 'admission' | 'sedation' | 'reference' | 'medications' | 'conditions' | 'temperature' | 'note' | 'history';

/** "3 h 40 min ago" etc. */
function useAge() {
  const t = useT();
  return (ms: number) => {
    const { h, m, s } = ageParts(ms);
    if (h > 0) return t.common.ago(t.common.hoursMinutes(h, m));
    if (m > 0) return t.common.ago(t.common.minutesShort(m));
    return t.common.ago(t.common.secondsShort(s));
  };
}

const sign = (v: number) => (v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '0');

/**
 * Patient profile drawer (task §3.2-B): same fields as admission, collapsible sections with
 * freshness, edits apply immediately (toast + 10 s Undo, audited), rule warnings before saving,
 * sticky "Effects active now" footer. 520 px, below the alert slot (D-27).
 */
export function ProfileDrawer({ top }: { top: number }) {
  const t = useT();
  const open = useMonitor((s) => s.panel === 'profile');
  const setPanel = useMonitor((s) => s.setPanel);
  const bedId = useMonitor((s) => s.bedId);
  const hasProfile = useClinical((s) => !!s.beds[bedId]?.profile);
  const view = useView();
  if (!hasProfile) return null;
  return (
    <RightDrawer
      open={open}
      onOpenChange={(o) => setPanel(o ? 'profile' : null)}
      top={top}
      title={t.entry.profile}
      subtitle={t.entry.profileOf(view.patient.ref, view.patient.bed)}
      footer={
        <div>
          <p className="mb-2 text-sm font-semibold">{t.entry.effectsNow}</p>
          <EffectChips effects={view.effects} />
        </div>
      }
    >
      {open ? <ProfileBody /> : null}
    </RightDrawer>
  );
}

function ProfileBody() {
  const t = useT();
  const l = useL10n();
  const age = useAge();
  const section = useMonitor((s) => s.profileSection);
  const actions = useBedActions();
  const view = useView();
  const bed = useClinical((s) => s.beds[actions.bedId])!;
  const p = bed.profile!;
  const now = view.now;
  const [openSections, setOpenSections] = useState<Set<SectionId>>(() => new Set<SectionId>(['identity', 'sedation', 'medications', ...(mapSection(section) ? [mapSection(section)!] : [])]));
  const [pending, setPending] = useState<{ rules: Contradiction[]; run: () => void } | null>(null);
  const [careConfirm, setCareConfirm] = useState<PatientProfile['careSetting'] | null>(null);
  const [removing, setRemoving] = useState<{ flag: FlagId; entryId: string } | null>(null);
  const [ageDraft, setAgeDraft] = useState<number | null>(p.ageYears);
  const [noteDraft, setNoteDraft] = useState(p.note);

  useEffect(() => {
    const target = mapSection(section);
    if (target) setTimeout(() => document.getElementById(`pd-${target}`)?.scrollIntoView?.({ block: 'start' }), 60);
  }, [section]);

  /** Check rules first; block → explain; confirm → explicit confirmation (task §3.3). */
  const guarded = (rules: Contradiction[], run: () => void) => {
    if (rules.length) setPending({ rules, run });
    else {
      setPending(null);
      run();
    }
  };
  const apply = (patch: Partial<PatientProfile>) => guarded(checkProfilePatch(bed, now, patch), () => actions.updateProfile(patch));

  useDebouncedCommit(ageDraft, (v) => {
    if (v === null || v === p.ageYears || !requiredSchema.shape.ageYears.safeParse(v).success) return;
    apply({ ageYears: v });
  });
  useDebouncedCommit(noteDraft, (v) => {
    if (v !== p.note && noteSchema.safeParse(v).success) apply({ note: v });
  });

  const ageIssue = ageDraft === null ? 'age' : requiredSchema.shape.ageYears.safeParse(ageDraft).error?.issues[0]?.message;
  const activeMeds = bed.context.filter((c) => !c.removed && FLAGS[c.flag].kind === 'medication');
  const activeConds = bed.context.filter((c) => !c.removed && FLAGS[c.flag].kind === 'condition');
  const toggle = (flag: FlagId, list: typeof activeMeds) => {
    const entry = list.find((c) => c.flag === flag);
    if (entry) setRemoving({ flag, entryId: entry.id });
    else guarded(checkFlagAdd(bed, now, flag), () => actions.addContext(flag, now));
  };
  const sci = view.effects.active.some((a) => a.flag === 'SCI_T6_OR_ABOVE');
  const removed = [
    ...bed.context.filter((c) => c.removed).map((c) => ({ id: c.id, label: flagLabel(c.flag), at: c.removed!.at, reason: c.removed!.reason, started: c.startedAt })),
    ...bed.events.filter((e) => e.removed).map((e) => ({ id: e.id, label: flagLabel(e.event), at: e.removed!.at, reason: e.removed!.reason, started: e.t })),
    ...bed.references.filter((r) => r.removed).map((r) => ({ id: r.id, label: { en: `${r.scale} ${r.value}`, fr: `${r.scale} ${r.value}` }, at: r.removed!.at, reason: r.removed!.reason, started: r.t })),
  ].sort((a, b) => b.at - a.at);
  const lastRef = [...bed.references].filter((r) => !r.removed).sort((a, b) => b.t - a.t)[0];
  const sec = (id: SectionId) => ({
    id,
    isOpen: openSections.has(id),
    onToggle: () => setOpenSections((s) => (s.has(id) ? new Set([...s].filter((x) => x !== id)) : new Set([...s, id]))),
  });

  return (
    <>
      {sci ? <SciBanner /> : null}
      {pending ? (
        <div className="sticky top-0 z-10 mt-2 bg-card pb-2">
          <RuleWarnings
            items={pending.rules}
            onCancel={() => setPending(null)}
            onConfirm={() => {
              pending.run();
              setPending(null);
            }}
          />
        </div>
      ) : null}

      <Section {...sec('identity')} title={t.entry.sections.identity} tier="required">
        <AgeField value={ageDraft} onChange={setAgeDraft} error={ageIssue && ageDraft !== p.ageYears ? (t.entry.errors as Record<string, string>)[ageIssue] : undefined} />
        <SexField value={p.sex} onChange={(v) => apply({ sex: v })} />
        <CareField value={careConfirm ?? p.careSetting} onChange={(v) => setCareConfirm(v === p.careSetting ? null : v)} />
        {careConfirm ? (
          <div className="rounded-[16px] border-theme border-card-border p-4 hc:border-ink">
            <ModeConfirmBody
              target={careConfirm}
              onCancel={() => setCareConfirm(null)}
              onConfirm={() => {
                const target = careConfirm;
                setCareConfirm(null);
                // care setting and alert mode commit together, after any rule confirmation (D-26)
                guarded(checkProfilePatch(bed, now, { careSetting: target }), () => {
                  actions.updateProfile({ careSetting: target });
                  useMonitor.getState().confirmMode(target);
                });
              }}
            />
          </div>
        ) : null}
        <CommunicationField value={p.communication} airway={p.airway} onChange={(v) => apply({ communication: v })} />
        <AirwayField value={p.airway} onChange={(v) => apply({ airway: v })} />
      </Section>

      <Section {...sec('admission')} title={t.entry.sections.admission} tier="recommended" status={p.admission ? null : <span className="text-sm text-muted">{t.entry.notRecorded}</span>}>
        <AdmissionField value={p.admission} now={now} onChange={(v) => apply({ admission: v })} />
      </Section>

      <Section
        {...sec('sedation')}
        title={t.entry.sections.sedation}
        tier="recommended"
        status={
          p.rass ? (
            <FreshnessTag stale={isStale('rass', p.rass.at, now, p.careSetting)}>{t.entry.freshness(`RASS ${sign(p.rass.value)}`, age(now - p.rass.at))}</FreshnessTag>
          ) : (
            <span className="text-sm text-muted">{t.entry.notRecorded}</span>
          )
        }
      >
        {p.rass && isStale('rass', p.rass.at, now, p.careSetting) ? <p className="text-sm font-medium text-advisory-text hc:text-advisory-border">{t.entry.staleHint}</p> : null}
        <RassField value={p.rass} now={now} onChange={(v) => apply({ rass: v })} />
        {p.cam ? <FreshnessTag stale={isStale('cam', p.cam.at, now, p.careSetting)}>{t.entry.freshness('CAM-ICU', age(now - p.cam.at))}</FreshnessTag> : null}
        <CamField value={p.cam} now={now} onChange={(v) => apply({ cam: v })} />
      </Section>

      <Section
        {...sec('reference')}
        title={t.entry.sections.reference}
        tier="recommended"
        status={
          lastRef ? (
            <FreshnessTag stale={isStale('reference', lastRef.t, now, p.careSetting)}>{t.entry.freshness(`${lastRef.scale} ${lastRef.value}`, age(now - lastRef.t))}</FreshnessTag>
          ) : (
            <span className="text-sm text-muted">{t.entry.notRecorded}</span>
          )
        }
      >
        <p className="text-sm text-text-2">{t.entry.referenceHint}</p>
        <Button variant="ghost" className="self-start" onClick={() => useMonitor.getState().setDialog('assessment', preferredScale(p))}>
          <ClipboardList aria-hidden size={18} strokeWidth={1.75} />
          {t.entry.enterAssessment}
        </Button>
      </Section>

      <Section {...sec('medications')} title={t.entry.sections.medications} tier="recommended" status={<span className="text-sm text-muted">{activeMeds.length || (p.medsReviewed ? t.entry.reviewedNone : t.entry.notRecorded)}</span>}>
        <FlagChips kind="medication" selected={activeMeds.map((c) => c.flag)} reviewedNone={p.medsReviewed} onToggle={(f) => toggle(f, activeMeds)} onNone={() => apply({ medsReviewed: true })} now={now} />
        {removing && FLAGS[removing.flag].kind === 'medication' ? (
          <RemovalRow flag={removing.flag} onPick={(r) => (actions.removeContext(removing.entryId, removing.flag, r), setRemoving(null))} onCancel={() => setRemoving(null)} />
        ) : null}
      </Section>

      <Section {...sec('conditions')} title={t.entry.sections.conditions} tier="recommended" status={<span className="text-sm text-muted">{activeConds.length || (p.conditionsReviewed ? t.entry.reviewedNone : t.entry.notRecorded)}</span>}>
        <FlagChips kind="condition" selected={activeConds.map((c) => c.flag)} reviewedNone={p.conditionsReviewed} onToggle={(f) => toggle(f, activeConds)} onNone={() => apply({ conditionsReviewed: true })} now={now} />
        {removing && FLAGS[removing.flag].kind === 'condition' ? (
          <RemovalRow flag={removing.flag} onPick={(r) => (actions.removeContext(removing.entryId, removing.flag, r), setRemoving(null))} onCancel={() => setRemoving(null)} />
        ) : null}
      </Section>

      <Section {...sec('temperature')} title={t.entry.sections.temperature} tier="optional">
        <CoreTempField value={p.coreTemp} now={now} onChange={(v) => apply({ coreTemp: v })} />
        <SkinField value={p.skin} onChange={(v) => apply({ skin: v })} />
      </Section>

      <Section {...sec('note')} title={t.entry.sections.note} tier="optional">
        <NoteField value={noteDraft} onChange={setNoteDraft} error={noteSchema.safeParse(noteDraft).success ? undefined : t.entry.errors.noteTooLong} />
      </Section>

      <Section {...sec('history')} title={t.entry.sections.history}>
        {removed.length === 0 ? (
          <p className="text-sm text-muted">{t.entry.historyEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {removed.map((r) => (
              <li key={r.id} className="text-sm">
                <span className="text-muted line-through decoration-1">
                  {l(r.label)} · {fmtTime(r.started, false)}
                </span>{' '}
                <span className="text-text-2">
                  — {l(REMOVAL[r.reason])}, {fmtTime(r.at, false)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

function Section({
  id,
  title,
  tier,
  status,
  isOpen,
  onToggle,
  children,
}: {
  id: SectionId;
  title: string;
  tier?: 'required' | 'recommended' | 'optional';
  status?: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-card-border py-3 hc:border-ink" aria-labelledby={`pd-${id}`}>
      <button id={`pd-${id}`} type="button" aria-expanded={isOpen} aria-controls={`pd-${id}-body`} onClick={onToggle} className="flex w-full items-center gap-3 rounded-[12px] py-1.5 text-left">
        <span className="nowrap text-lg font-semibold">{title}</span>
        {tier ? <Tier tier={tier} /> : null}
        <span className="ml-auto min-w-0 truncate text-right">{status}</span>
        <ChevronDown aria-hidden size={18} className={cn('shrink-0 transition-transform duration-150', isOpen && 'rotate-180')} />
      </button>
      {isOpen ? (
        <div id={`pd-${id}-body`} className="mt-3 flex flex-col gap-5">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function RemovalRow({ flag, onPick, onCancel }: { flag: FlagId; onPick: (r: RemovalReason) => void; onCancel: () => void }) {
  const t = useT();
  const l = useL10n();
  return (
    <div role="group" aria-label={t.entry.remove.title(l(flagLabel(flag)))} className="rounded-[14px] border-theme border-card-border p-3 hc:border-ink">
      <p className="mb-2 text-sm font-medium">{t.entry.remove.title(l(flagLabel(flag)))}</p>
      <div className="flex flex-wrap gap-2">
        {(['stopped', 'error', 'other'] as RemovalReason[]).map((r) => (
          <Button key={r} variant="ghost" size="sm" onClick={() => onPick(r)}>
            {l(REMOVAL[r])}
          </Button>
        ))}
        <Button variant="link" size="sm" onClick={onCancel}>
          {t.common.cancel}
        </Button>
      </div>
    </div>
  );
}

function mapSection(s: string | null): SectionId | null {
  if (!s) return null;
  const m: Record<string, SectionId> = {
    identity: 'identity',
    admission: 'admission',
    rass: 'sedation',
    cam: 'sedation',
    sedation: 'sedation',
    reference: 'reference',
    medications: 'medications',
    conditions: 'conditions',
    temperature: 'temperature',
    note: 'note',
    history: 'history',
  };
  return m[s] ?? null;
}

/** Commit a draft value after 900 ms without changes (one audit entry per edit, not per tap). */
function useDebouncedCommit<T>(value: T, commit: (v: T) => void) {
  const first = useRef(true);
  const cb = useRef(commit);
  useEffect(() => {
    cb.current = commit;
  });
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => cb.current(value), 900);
    return () => clearTimeout(id);
  }, [value]);
}
