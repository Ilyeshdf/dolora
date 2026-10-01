import { ArrowUpRight, Info } from 'lucide-react';
import { useFormat, useT } from '@/i18n';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { AddChip, ContextChip } from '@/components/ui/Chip';
import { PopoverPanel } from '@/components/ui/Overlay';
import { RouteIcon } from '@/components/ui/RouteIcon';
import { TooltipBubble } from '@/components/ui/Tooltip';
import { DriverRow } from '@/components/clinical/DriverRow';
import { ModeConfirmBody, ModeControl } from '@/components/clinical/HeaderPills';
import { cn } from '@/lib/cn';
import { SectionHeader, VariantLabel } from './helpers';

// Static renderings of hover / focus for the buttons table (the live states use the same tokens).
const HOVER: Record<string, string> = {
  primary: 'bg-pill-active/85',
  action: 'brightness-95',
  outline: 'bg-subtle',
  ghost: 'bg-subtle',
  icon: 'bg-subtle',
};
const FOCUS = 'outline outline-[length:var(--focus-w)] outline-offset-2 outline-focus';

/** A8 sheet 3 — context chips, buttons, driver rows, ICU/Ward mode. */
export function Sheet3() {
  const t = useT();
  const f = useFormat();
  const rows = [
    { key: 'primary', label: t.buttons.darkPrimary, node: (cls: string, dis: boolean) => <Button className={cls} disabled={dis}>{t.common.save}</Button> },
    {
      key: 'action',
      label: t.buttons.roundYellow,
      node: (cls: string, dis: boolean) => (
        <Button variant="action" size="icon" aria-label={t.telemetry.open} className={cls} disabled={dis}>
          <ArrowUpRight aria-hidden size={20} strokeWidth={1.75} />
        </Button>
      ),
    },
    { key: 'outline', label: t.buttons.outlinePill, node: (cls: string, dis: boolean) => <Button variant="outline" className={cls} disabled={dis}>{t.alertSlot.acknowledge}</Button> },
    { key: 'ghost', label: t.buttons.ghost, node: (cls: string, dis: boolean) => <Button variant="ghost" className={cls} disabled={dis}>{t.common.cancel}</Button> },
    {
      key: 'icon',
      label: t.buttons.roundIcon,
      node: (cls: string, dis: boolean) => (
        <Button variant="icon" size="icon" aria-label={t.buttons.help} className={cn('text-lg font-bold', cls)} disabled={dis}>
          ?
        </Button>
      ),
    },
  ];

  return (
    <div className="grid gap-x-6 gap-y-10 min-[1860px]:grid-cols-[892px_892px]">
      <div className="flex flex-col gap-10">
        <section>
          <SectionHeader n="06" title={t.dev.sections.chips} note={t.dev.sections.chipsNote} />
          <div className="mt-4 flex gap-8">
            <div>
              <VariantLabel>{t.dev.variants.persistent}</VariantLabel>
              <ContextChip kind="persistent" route="measurement" label={t.demo.chips.ventilation} />
            </div>
            <div>
              <VariantLabel>{t.dev.variants.timed}</VariantLabel>
              <ContextChip kind="timed" route="prior" label={t.demo.chips.suctioning} remaining="1:24" fraction={0.7} />
            </div>
            <div>
              <VariantLabel>{t.dev.variants.add}</VariantLabel>
              <AddChip />
            </div>
          </div>
          <VariantLabel className="mt-6">{t.dev.variants.hoverTooltip}</VariantLabel>
          <ContextChip kind="persistent" route="measurement" label={t.demo.chips.betaBlocker} forceHover />
          <TooltipBubble className="mt-3 w-[396px]">
            <p className="flex items-center gap-1.5 text-xs opacity-80">
              <RouteIcon route="measurement" size={14} />
              {t.routes.measurement}
            </p>
            <p className="mt-1">{t.demo.chips.betaBlockerEffect}</p>
          </TooltipBubble>
          <VariantLabel className="mt-6">{t.dev.variants.routeIcons}</VariantLabel>
          <div className="grid grid-cols-3 gap-6">
            {(['prior', 'measurement', 'baseline'] as const).map((r) => (
              <div key={r} className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card shadow-card hc:border-2 hc:border-ink">
                  <RouteIcon route={r} size={20} />
                </span>
                <div>
                  <p className="text-md font-medium">{t.routes[r]}</p>
                  <p className="text-sm text-text-2">{t.routes[`${r}Desc`]}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader n="11" title={t.dev.sections.drivers} note={t.dev.sections.driversNote} />
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <VariantLabel>{t.dev.variants.driverDefault}</VariantLabel>
              <Card padding="md" className="px-4 py-3">
                <DriverRow title={t.demo.drivers.scr} subline={t.demo.drivers.scrSub} direction="up" contribution={0.41} />
              </Card>
            </div>
            <div>
              <VariantLabel>{t.dev.variants.driverHover}</VariantLabel>
              <Card padding="md" className="px-4 py-3">
                <DriverRow title={t.demo.drivers.pulse} subline={t.demo.drivers.pulseSub} direction="down" contribution={0.29} highlighted />
              </Card>
              <TooltipBubble className="ml-4 mt-3 w-[340px]">
                {t.drivers.tooltip(`${f.num(0.62, 2)} a.u.`, f.num(1, 2), f.signed(-2.3, 1), f.signed(0.29), f.num(0.97, 2))}
              </TooltipBubble>
            </div>
            <div>
              <VariantLabel>{t.dev.variants.driverWeighted}</VariantLabel>
              <Card padding="md" className="px-4 py-3">
                <DriverRow title={t.demo.drivers.hr} subline={t.demo.drivers.hrSub} direction="up" contribution={0.03} weight={0.3} />
              </Card>
            </div>
            <div>
              <VariantLabel>{t.dev.variants.driverDegraded}</VariantLabel>
              <Card padding="md" className="px-4 py-3">
                <DriverRow title={t.demo.drivers.brow} subline="z 1.9" direction="up" contribution={0.18} degradedReliability={0.52} />
              </Card>
            </div>
          </div>
        </section>
      </div>

      <div className="flex flex-col gap-10">
        <section>
          <SectionHeader n="08" title={t.dev.sections.buttons} note={t.dev.sections.buttonsNote} />
          <Card padding="md" className="mt-4 px-6">
            <table className="w-full border-separate border-spacing-y-3 text-left">
              <thead>
                <tr className="text-sm text-text-2">
                  <th className="w-[184px]" />
                  <th className="font-medium">{t.buttons.default}</th>
                  <th className="font-medium">{t.buttons.hover}</th>
                  <th className="font-medium">{t.buttons.focus}</th>
                  <th className="font-medium">{t.buttons.disabled}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td className="nowrap text-md">{r.label}</td>
                    <td>{r.node('', false)}</td>
                    <td>{r.node(HOVER[r.key] ?? '', false)}</td>
                    <td>{r.node(FOCUS, false)}</td>
                    <td>{r.node('', true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>

        <section>
          <SectionHeader n="10" title={t.dev.sections.mode} />
          <div className="mt-4 grid grid-cols-[300px_1fr] gap-6">
            <div className="flex flex-col gap-2">
              <VariantLabel className="mb-0">{t.mode.icuActive}</VariantLabel>
              <ModeControl mode="ICU" onRequest={() => undefined} showRule={false} />
              <p className="text-sm text-text-2">{t.mode.icuRuleLong}</p>
              <VariantLabel className="mb-0 mt-6">{t.mode.wardActive}</VariantLabel>
              <ModeControl mode="WARD" onRequest={() => undefined} showRule={false} />
              <p className="text-sm text-text-2">{t.mode.wardRuleLong}</p>
            </div>
            <div>
              <VariantLabel className="flex items-center gap-1.5">
                <Info aria-hidden size={12} />
                {t.mode.confirmBefore}
              </VariantLabel>
              <PopoverPanel className="px-8 py-7">
                <ModeConfirmBody target="WARD" onCancel={() => undefined} onConfirm={() => undefined} />
              </PopoverPanel>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
