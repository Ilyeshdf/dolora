import { useT } from '@/i18n';
import { AlertSlot } from '@/components/ui/AlertSlot';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AttributionBar } from '@/components/clinical/AttributionBar';
import { SensorHotspot, type HotspotState } from '@/components/clinical/SensorHotspot';
import { ClipboardList, Activity } from 'lucide-react';
import { SectionHeader, ThemeScope, VariantLabel } from './helpers';
import type { Theme } from '@/store/prefs';

/** A8 sheet 2 — alert slot, attribution bar, sensor hotspot states. */
export function Sheet2() {
  const t = useT();
  return (
    <div className="mx-auto flex w-full flex-col gap-10">
      <section>
        <SectionHeader n="07" title={t.dev.sections.alertSlot} note={t.dev.sections.alertSlotNote} />
        <div className="mt-3 flex flex-col gap-2">
          <VariantLabel className="mb-0">{t.dev.variants.alertEmpty}</VariantLabel>
          <AlertSlot variant="empty" title={t.alertSlot.noAlerts} />
          <VariantLabel className="mb-0 mt-2">{t.dev.variants.alertInfo}</VariantLabel>
          <AlertSlot variant="info" title={t.alertSlot.calibrating} right={<span className="nowrap text-md font-medium">{t.alertSlot.remaining('0:36')}</span>} />
          <VariantLabel className="mb-0 mt-2">{t.dev.variants.alertAlert}</VariantLabel>
          <AlertSlot
            variant="alert"
            title={t.alertSlot.possiblePain}
            detail={t.alertSlot.ruleSince('upper 80% bound ≥ 4 for 30 s', '14:31:40', '1 min 12 s')}
            right={
              <>
                <Button variant="onAlert">{t.alertSlot.acknowledge}</Button>
                <Button variant="onAlertSolid">{t.alertSlot.assess}</Button>
              </>
            }
          />
          <VariantLabel className="mb-0 mt-2">{t.dev.variants.alertAck}</VariantLabel>
          <AlertSlot variant="acknowledged" title={t.alertSlot.acknowledgedBy('DR', '14:32')} />
          <VariantLabel className="mb-0 mt-2">{t.dev.variants.alertAdvisory}</VariantLabel>
          <AlertSlot
            variant="advisory"
            title={t.alertSlot.nmb}
            right={
              <span className="nowrap flex items-center gap-2 text-md font-medium">
                <Activity aria-hidden size={18} strokeWidth={1.75} />
                {t.alertSlot.autonomicOnly}
              </span>
            }
          />
          <VariantLabel className="mb-0 mt-2">{t.dev.variants.alertAdvisoryAction}</VariantLabel>
          <AlertSlot
            variant="advisory"
            icon="clipboard"
            title={t.alertSlot.unavailable}
            right={
              <Button variant="advisory">
                <ClipboardList aria-hidden size={18} strokeWidth={1.75} />
                {t.alertSlot.perform}
              </Button>
            }
          />
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-2 gap-4">
        <section>
          <SectionHeader n="03" title={t.dev.sections.attribution} note={t.dev.sections.attributionNote} />
          <Card padding="md" className="mt-3 flex flex-col gap-5">
            <div>
              <VariantLabel>{t.dev.variants.standard}</VariantLabel>
              <AttributionBar shares={{ pain: 0.72, stress: 0.16, agitation: 0.08, rest: 0.04, unexplained: 0 }} />
            </div>
            <div>
              <VariantLabel>{t.dev.variants.withUnexplained}</VariantLabel>
              <AttributionBar shares={{ pain: 0.68, stress: 0.14, agitation: 0.08, rest: 0.03, unexplained: 0.07 }} />
            </div>
            <div>
              <VariantLabel>{t.dev.variants.hcPatterns}</VariantLabel>
              <ThemeScope theme="hc" className="rounded-[16px] bg-card p-4">
                <AttributionBar shares={{ pain: 0.68, stress: 0.14, agitation: 0.08, rest: 0.03, unexplained: 0.07 }} />
              </ThemeScope>
            </div>
            <div>
              <VariantLabel>{t.dev.variants.empty}</VariantLabel>
              <AttributionBar shares={null} />
            </div>
          </Card>
        </section>

        <section>
          <SectionHeader n="05" title={t.dev.sections.hotspots} note={t.dev.sections.hotspotsNote} />
          <Card padding="md" className="mt-3">
            <HotspotTable />
          </Card>
        </section>
      </div>
    </div>
  );
}

function HotspotTable() {
  const t = useT();
  const rows: { state: HotspotState; hl?: boolean; name: string; shape: string; meaning: string }[] = [
    { state: 'ok', name: t.sensors.ok, shape: t.sensors.okShape, meaning: t.sensors.okMeaning },
    { state: 'degraded', name: t.sensors.degraded, shape: t.sensors.degradedShape, meaning: t.sensors.degradedMeaning },
    { state: 'rejected', name: t.sensors.rejected, shape: t.sensors.rejectedShape, meaning: t.sensors.rejectedMeaning },
    { state: 'masked', name: t.sensors.maskedByContext, shape: t.sensors.maskedShape, meaning: t.sensors.maskedMeaning },
    { state: 'derived', name: t.sensors.derived, shape: t.sensors.derivedShape, meaning: t.sensors.derivedMeaning },
    { state: 'ok', hl: true, name: t.sensors.highlighted, shape: t.sensors.highlightedShape, meaning: t.sensors.highlightedMeaning },
  ];
  const themes: Theme[] = ['projector', 'night', 'hc'];
  return (
    <table className="w-full border-separate border-spacing-y-1.5 text-left">
      <thead>
        <tr className="text-xs text-text-2">
          <th className="nowrap font-medium">{t.sensors.state}</th>
          {themes.map((th) => (
            <th key={th} className="nowrap pr-2 font-medium">
              {t.themes[th]}
            </th>
          ))}
          <th className="font-medium" />
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name}>
            <td className="pr-2">
              <p className="nowrap text-sm font-medium">{r.name}</p>
              <p className="nowrap text-xs text-muted">{r.shape}</p>
            </td>
            {themes.map((th) => (
              <td key={th} className="pr-2">
                <ThemeScope theme={th} className="grid h-10 w-[62px] place-items-center rounded-[8px] bg-card ring-1 ring-card-border hc:ring-0 night:ring-0" >
                  <SensorHotspot state={r.state} highlighted={r.hl} size={16} />
                </ThemeScope>
              </td>
            ))}
            <td className="text-xs text-text-2">{r.meaning}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
