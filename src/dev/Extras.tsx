import { useState } from 'react';
import { Info, TriangleAlert } from 'lucide-react';
import { useT } from '@/i18n';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Wordmark, Footer } from '@/components/ui/Brand';
import {
  EffectLine,
  Field,
  FreshnessTag,
  PinInput,
  RelativeTimePicker,
  Select,
  Stepper,
  Switch,
  TextArea,
  TextInput,
  type RelativePick,
} from '@/components/ui/Form';
import { Dialog, DialogContent, DialogTrigger, Popover, PopoverContent, PopoverTrigger, SheetContent } from '@/components/ui/Overlay';
import { Segmented } from '@/components/ui/Segmented';
import { StatusPill } from '@/components/ui/StatusPill';
import { ToastCard } from '@/components/ui/Toast';
import { toast } from '@/components/ui/toastStore';
import { Tooltip } from '@/components/ui/Tooltip';
import { BaselinePill, ModeConfirmBody } from '@/components/clinical/HeaderPills';
import { SeverityPill, SeverityTag } from '@/components/clinical/severity';
import { SectionHeader, VariantLabel } from './helpers';
import * as RD from '@radix-ui/react-dialog';

type Sex = 'female' | 'male' | 'other' | 'unknown';

/**
 * Patterns for screens that have no design yet (admission wizard, profile drawer, NRS entry…).
 * Built from the designed primitives; assumptions are recorded in DECISIONS.md D-34…D-38.
 * No clinical logic lives here — only the visual/interaction building blocks.
 */
export function Extras() {
  const t = useT();
  const [age, setAge] = useState<number | null>(64);
  const [badAge, setBadAge] = useState<number | null>(16);
  const [sex, setSex] = useState<Sex | null>('female');
  const [rel, setRel] = useState<RelativePick>('0');
  const [intubated, setIntubated] = useState(true);
  const [unit, setUnit] = useState<string | undefined>('icu');
  const [pin, setPin] = useState('12');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [popOpen, setPopOpen] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-[1484px] flex-col gap-10">
      <p className="max-w-[900px] text-md text-text-2">{t.dev.extrasSubtitle}</p>

      <div className="grid grid-cols-2 gap-6">
        <section>
          <SectionHeader n="15" title={t.dev.sections.inputs} />
          <Card padding="lg" className="mt-3 flex flex-col gap-6">
            <Field label={t.forms.patientId} htmlFor="x-pid" hint="P-7F3A">
              <TextInput id="x-pid" defaultValue="P-7F3A" readOnly />
            </Field>
            <Field label={t.forms.age} htmlFor="x-age" required>
              <Stepper id="x-age" label={t.forms.age} value={age} onChange={setAge} min={18} max={110} />
            </Field>
            <Field label={`${t.forms.age} · ${t.dev.errorState}`} htmlFor="x-age2" error={t.forms.ageRange}>
              <Stepper id="x-age2" label={t.forms.age} value={badAge} onChange={setBadAge} min={0} max={110} invalid />
            </Field>
            <Field label={t.forms.sex} required>
              <Segmented<Sex>
                aria-label={t.forms.sex}
                value={sex}
                onChange={setSex}
                block
                options={[
                  { value: 'female', label: t.forms.female },
                  { value: 'male', label: t.forms.male },
                  { value: 'other', label: t.forms.other },
                  { value: 'unknown', label: t.forms.notRecorded },
                ]}
              />
            </Field>
            <Field
              label={t.demo.chips.betaBlocker}
              effect={{ route: 'measurement', text: t.demo.chips.betaBlockerEffect }}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-text-2">{t.forms.started}</span>
                <RelativeTimePicker label={t.forms.started} value={rel} onChange={setRel} />
              </div>
            </Field>
            <div className="flex items-center gap-3">
              <Switch id="x-intub" checked={intubated} onCheckedChange={setIntubated} />
              <label htmlFor="x-intub" className="text-md">
                {t.forms.intubated}
              </label>
            </div>
            <Field label={t.forms.staffId} htmlFor="x-staff" error={t.forms.notRecognised}>
              <TextInput id="x-staff" defaultValue="004521" invalid />
            </Field>
            <Field label={t.forms.unit} htmlFor="x-unit">
              <Select
                id="x-unit"
                value={unit}
                onValueChange={setUnit}
                options={[
                  { value: 'icu', label: t.forms.unitIcu },
                  { value: 'ward', label: t.forms.unitWard },
                ]}
              />
            </Field>
            <Field label={t.forms.note} htmlFor="x-note">
              <TextArea id="x-note" placeholder={t.forms.notePlaceholder} rows={2} />
            </Field>
            <div>
              <VariantLabel>{t.forms.pin}</VariantLabel>
              <PinInput value={pin} onChange={setPin} />
            </div>
          </Card>
        </section>

        <div className="flex flex-col gap-10">
          <section>
            <SectionHeader n="16" title={t.dev.sections.feedback} />
            <Card padding="lg" className="mt-3 flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-3">
                <EffectLine route="measurement">{t.demo.effects.hrvDisabled}</EffectLine>
                <EffectLine route="prior">{t.demo.effects.opioid}</EffectLine>
                <EffectLine route="baseline">{t.baseline.recalibration}</EffectLine>
              </div>
              <div className="flex flex-wrap items-center gap-6">
                <FreshnessTag>RASS −2 · {t.common.hoursMinutes(1, 10)}</FreshnessTag>
                <FreshnessTag stale>CAM-ICU · {t.common.hoursMinutes(4, 40)}</FreshnessTag>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge tone="advisory" icon={<Info aria-hidden size={15} />}>
                  {t.hero.coverageNotValidated}
                </Badge>
                <Badge tone="weight" size="sm">
                  {t.drivers.weight('0.3')}
                </Badge>
                <Badge tone="info">{t.connection.simulatedData}</Badge>
                <Badge tone="alert" icon={<TriangleAlert aria-hidden size={15} />}>{t.alertSlot.alertBadge}</Badge>
                <Badge tone="muted">{t.audit.clinician('DR')}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SeverityPill severity="mild" />
                <SeverityPill severity="moderate" />
                <SeverityPill severity="severe" />
                <SeverityTag severity="moderate" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill size="sm">{t.hero.signalsOk}</StatusPill>
                <StatusPill tone="slate" dot="none">
                  {t.hero.unavailableTitle}
                </StatusPill>
                <BaselinePill state="adaptive" />
                <BaselinePill state="recalibration" />
                <BaselinePill state="adaptive" provisional />
              </div>
              <ToastCard
                item={{ id: 0, title: t.toast.profileUpdated, description: 'RASS −2', action: { label: t.common.undo, onAction: () => undefined } }}
                onClose={() => undefined}
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="ghost"
                  onClick={() => toast({ title: t.toast.referenceRecorded, description: 'CPOT 4 / 8', action: { label: t.common.undo, onAction: () => undefined } })}
                >
                  {t.dev.showToast}
                </Button>
                <Tooltip content={t.demo.chips.betaBlockerEffect}>
                  <Button variant="ghost">{t.dev.hoverMe}</Button>
                </Tooltip>
              </div>
            </Card>
          </section>

          <section>
            <SectionHeader n="17" title={t.dev.sections.layout} />
            <Card padding="lg" className="mt-3 flex flex-col gap-5">
              <Wordmark />
              <div className="flex flex-wrap gap-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>{t.dev.openDialog}</Button>
                  </DialogTrigger>
                  <DialogContent title={t.dev.dialogTitle} description={t.dev.dialogBody} meta={`P-7F3A · ${t.common.bed} 4 · 14:33`}>
                    <div className="mt-8 flex justify-end gap-3">
                      <RD.Close asChild>
                        <Button variant="ghost" size="lg">
                          {t.common.cancel}
                        </Button>
                      </RD.Close>
                      <RD.Close asChild>
                        <Button size="lg">{t.common.save}</Button>
                      </RD.Close>
                    </div>
                  </DialogContent>
                </Dialog>
                <RD.Root open={sheetOpen} onOpenChange={setSheetOpen}>
                  <RD.Trigger asChild>
                    <Button variant="outline">{t.dev.openSheet}</Button>
                  </RD.Trigger>
                  <SheetContent title={t.dev.sheetTitle} subtitle={`P-7F3A · ${t.common.bed} 4`} top={208} footer={<p className="text-sm text-text-2">{t.dev.sheetFooter}</p>}>
                    <p className="text-md text-text-2">{t.dev.sheetBody}</p>
                  </SheetContent>
                </RD.Root>
                <Popover open={popOpen} onOpenChange={setPopOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost">{t.dev.openPopover}</Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <ModeConfirmBody target="WARD" onCancel={() => setPopOpen(false)} onConfirm={() => setPopOpen(false)} />
                  </PopoverContent>
                </Popover>
              </div>
              <Segmented
                className="self-start"
                aria-label={t.dev.segmentedSizes}
                size="lg"
                value="b"
                onChange={() => undefined}
                options={[
                  { value: 'a', label: t.nav.unit },
                  { value: 'b', label: t.nav.monitor },
                  { value: 'c', label: t.nav.timeline },
                ]}
              />
              <Segmented
                className="self-start"
                aria-label={t.dev.segmentedSizes}
                size="sm"
                value="10"
                onChange={() => undefined}
                options={[
                  { value: '5', label: '5' },
                  { value: '10', label: '10' },
                  { value: '30', label: '30' },
                ]}
              />
              <div className="rounded-[16px] border border-dashed border-card-border py-3">
                <Footer className="px-4" />
              </div>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
