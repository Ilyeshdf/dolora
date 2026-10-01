import { Command } from 'cmdk';
import { Anchor, ClipboardList, History, Plus, UserRound } from 'lucide-react';
import { EVENTS, FLAGS, flagLabel } from '@/clinical/clinicalEffects';
import { preferredScale } from '@/clinical/profile';
import { useL10n, useT } from '@/i18n';
import { useClinical } from '@/store/clinical';
import { useMonitor } from '@/store/monitor';
import { RouteIcon } from '@/components/ui/RouteIcon';
import { checkFlagAdd, useBedActions } from '@/features/entry/useBedActions';

const itemClass = 'flex h-11 cursor-pointer items-center gap-3 rounded-[12px] px-3 text-md data-[selected=true]:bg-subtle';
const groupClass =
  '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted';

/**
 * Ctrl+K command palette (task §3.1-8): "Add context / Log event / Update profile" plus
 * assessments, baseline and audit. Keyboard-first; every command maps to the same audited
 * actions as the pointer UI. Events that trigger a rule warning open the Log-event flow instead.
 */
export function CommandPalette() {
  const t = useT();
  const l = useL10n();
  const open = useMonitor((s) => s.paletteOpen);
  const setOpen = useMonitor((s) => s.setPaletteOpen);
  const setPanel = useMonitor((s) => s.setPanel);
  const setDialog = useMonitor((s) => s.setDialog);
  const setAddContext = useMonitor((s) => s.setAddContextOpen);
  const actions = useBedActions();
  const profile = useClinical((s) => s.beds[actions.bedId]?.profile ?? null);
  const run = (fn: () => void) => {
    setOpen(false);
    // let the palette close before opening another overlay
    setTimeout(fn, 0);
  };
  const profileSections: { id: string; label: string }[] = [
    { id: 'identity', label: t.entry.sections.identity },
    { id: 'sedation', label: t.entry.sections.sedation },
    { id: 'medications', label: t.entry.sections.medications },
    { id: 'conditions', label: t.entry.sections.conditions },
    { id: 'admission', label: t.entry.sections.admission },
    { id: 'temperature', label: t.entry.sections.temperature },
  ];

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label={t.entry.palette.label}
      loop
      overlayClassName="fixed inset-0 z-50 bg-scrim/40"
      contentClassName="fixed left-1/2 top-[18vh] z-50 w-[640px] max-w-[calc(100vw-32px)] -translate-x-1/2 overflow-hidden rounded-card border-theme border-card-outline bg-card shadow-card hc:border-ink"
    >
      <Command.Input placeholder={t.entry.palette.placeholder} className="h-14 w-full border-b border-card-border bg-transparent px-5 text-lg outline-none placeholder:text-muted hc:border-ink" />
      <Command.List className="max-h-[420px] overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-center text-sm text-muted">{t.entry.addContext.noResults}</Command.Empty>

        <Command.Group heading={t.entry.palette.groups.context} className={groupClass}>
          <Command.Item value="add-context" keywords={['add context', 'medication', 'condition', 'contexte']} onSelect={() => run(() => setAddContext(true))} className={itemClass}>
            <Plus aria-hidden size={18} /> {t.entry.palette.openAddContext}
          </Command.Item>
        </Command.Group>

        <Command.Group heading={t.entry.palette.groups.events} className={groupClass}>
          {EVENTS.map((e) => (
            <Command.Item
              key={e}
              value={`event-${e}`}
              keywords={[FLAGS[e].label.en, FLAGS[e].label.fr, 'log', 'event']}
              onSelect={() =>
                run(() => {
                  const rules = checkFlagAdd(useClinical.getState().bed(actions.bedId), actions.now(), e);
                  if (rules.length) setAddContext(true);
                  else actions.logEvent(e, actions.now());
                })
              }
              className={itemClass}
            >
              <RouteIcon route={FLAGS[e].routes[0] ?? 'prior'} size={18} /> {t.entry.palette.logNow(l(flagLabel(e, false)))}
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading={t.entry.palette.groups.profile} className={groupClass}>
          <Command.Item value="profile-open" keywords={['profile', 'patient', 'profil']} onSelect={() => run(() => setPanel('profile'))} className={itemClass}>
            <UserRound aria-hidden size={18} /> {t.entry.palette.openProfile}
          </Command.Item>
          {profileSections.map((s) => (
            <Command.Item key={s.id} value={`profile-${s.id}`} keywords={[s.label]} onSelect={() => run(() => setPanel('profile', s.id))} className={itemClass}>
              <UserRound aria-hidden size={18} className="opacity-60" /> {t.entry.palette.section(s.label)}
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Group heading={t.entry.palette.groups.assess} className={groupClass}>
          <Command.Item value="assess-cpot" keywords={['cpot', 'bps', 'pain', 'douleur']} onSelect={() => run(() => setDialog('assessment', preferredScale(profile) === 'NRS' ? 'CPOT' : preferredScale(profile)))} className={itemClass}>
            <ClipboardList aria-hidden size={18} /> {t.entry.palette.assessCpot}
          </Command.Item>
          <Command.Item value="assess-nrs" keywords={['nrs', 'self-report', 'EN']} onSelect={() => run(() => setDialog('assessment', 'NRS'))} className={itemClass}>
            <ClipboardList aria-hidden size={18} /> {t.entry.palette.assessNrs}
          </Command.Item>
        </Command.Group>

        <Command.Group heading={t.entry.palette.groups.other} className={groupClass}>
          <Command.Item value="baseline" keywords={['baseline', 'référence']} onSelect={() => run(() => useMonitor.getState().setBaselineOpen(true))} className={itemClass}>
            <Anchor aria-hidden size={18} /> {t.entry.palette.markBaseline}
          </Command.Item>
          <Command.Item value="audit" keywords={['audit', 'history', 'journal']} onSelect={() => run(() => setPanel('audit'))} className={itemClass}>
            <History aria-hidden size={18} /> {t.entry.palette.audit}
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
