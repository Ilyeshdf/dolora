import { LangScope, useT } from '@/i18n';
import { Card } from '@/components/ui/Card';
import { PainHeroCard } from '@/components/clinical/PainHeroCard';
import { ScaleBar } from '@/components/clinical/ScaleBar';
import { ArcGauge } from '@/components/clinical/Gauges';
import { SectionHeader, VariantLabel, Zoom } from './helpers';

const HERO_ZOOM = 312 / 440;

/** A8 sheet 1 — pain hero card states, scale bar, gauges. */
export function Sheet1() {
  const t = useT();
  return (
    <div className="grid gap-x-5 gap-y-10 min-[1500px]:grid-cols-[972px_312px]">
      <section aria-labelledby="s-hero">
        <SectionHeader n="01" title={t.dev.sections.hero} note={t.dev.sections.heroNote} />
        <div className="mt-4 grid grid-cols-3 gap-x-[18px] gap-y-6">
          <div>
            <VariantLabel>{t.dev.variants.okMild}</VariantLabel>
            <Zoom factor={HERO_ZOOM}>
              <PainHeroCard state="ok" score={2.1} lo={0.9} hi={3.4} trend={{ direction: 'stable', slopePerMin: 0 }} episode={null} className="h-[478px]" />
            </Zoom>
          </div>
          <div>
            <VariantLabel>{t.dev.variants.okModerate}</VariantLabel>
            <Zoom factor={HERO_ZOOM}>
              <PainHeroCard
                state="ok"
                score={6.4}
                lo={4.3}
                hi={8.1}
                trend={{ direction: 'rising', slopePerMin: 0.9 }}
                episode={{ since: '14:30:21', elapsed: '2 min 31 s' }}
                className="h-[478px]"
              />
            </Zoom>
          </div>
          <div>
            <VariantLabel>{t.dev.variants.okSevere}</VariantLabel>
            <Zoom factor={HERO_ZOOM}>
              <PainHeroCard
                state="ok"
                score={8.3}
                lo={7.0}
                hi={9.4}
                trend={{ direction: 'rising', slopePerMin: 0.4 }}
                episode={{ since: '14:22:05', elapsed: '10 min 47 s' }}
                className="h-[478px]"
              />
            </Zoom>
          </div>
          <div>
            <VariantLabel>{t.dev.variants.degraded}</VariantLabel>
            <Zoom factor={HERO_ZOOM}>
              <PainHeroCard
                state="ok"
                score={5.2}
                lo={2.9}
                hi={7.8}
                trend={{ direction: 'stable', slopePerMin: 0 }}
                episode={null}
                degraded={{ reducedSensors: t.demo.sensorsReduced }}
                coverageNotValidated
                className="h-[478px]"
              />
            </Zoom>
          </div>
          <div>
            <VariantLabel>{t.dev.variants.rejected}</VariantLabel>
            <Zoom factor={HERO_ZOOM}>
              <PainHeroCard
                state="abstain"
                lastValid={{ score: 5.9, age: t.common.ago(t.common.secondsShort(45)) }}
                reasons={[
                  { kind: 'rejected', text: t.demo.reasons.movement },
                  { kind: 'degraded', text: t.demo.reasons.motion },
                ]}
                className="h-[478px]"
              />
            </Zoom>
          </div>
          <div>
            <VariantLabel>{t.dev.variants.french}</VariantLabel>
            <FrenchHero />
          </div>
        </div>
      </section>

      <div className="grid gap-10 max-[1499px]:grid-cols-[312px_312px] min-[1500px]:flex min-[1500px]:flex-col">
        <section>
          <SectionHeader n="02" title={t.dev.sections.scaleBar} note={t.dev.sections.scaleBarNote} />
          <Card padding="md" className="mt-4 flex flex-col gap-6 px-6">
            <div>
              <VariantLabel>6.4 · {t.scale.interval80} 4.3 – 8.1</VariantLabel>
              <ScaleBar score={6.4} lo={4.3} hi={8.1} />
            </div>
            <div>
              <VariantLabel>{t.dev.variants.narrow} · 1.8 · 1.2 – 2.6</VariantLabel>
              <ScaleBar score={1.8} lo={1.2} hi={2.6} />
            </div>
            <div>
              <VariantLabel>{t.dev.variants.wide} · 5.2 · 2.9 – 7.8</VariantLabel>
              <ScaleBar score={5.2} lo={2.9} hi={7.8} />
            </div>
          </Card>
        </section>
        <section>
          <SectionHeader n="04" title={t.dev.sections.gauges} />
          <Card tone="sky" padding="md" className="mt-4 flex flex-col gap-3 px-3">
            {(
              [
                [t.dev.variants.lowArousal, 0.4, 1.2, 2.4],
                [t.dev.variants.moderateArousal, 1.4, 4.5, 6.0],
                [t.dev.variants.highArousal, 2.6, 8.2, 9.3],
              ] as const
            ).map(([label, z, p, hi]) => (
              <div key={label}>
                <VariantLabel className="px-3">{label}</VariantLabel>
                <Zoom factor={0.82} className="flex justify-around">
                  <ArcGauge kind="arousal" value={z} label={t.arousal.autonomic} />
                  <ArcGauge kind="pain" value={p} hi={hi} label={t.arousal.pain} />
                </Zoom>
              </div>
            ))}
          </Card>
        </section>
      </div>
    </div>
  );
}

/** FR variant — always rendered with the French dictionary (decimal comma, FR labels). */
function FrenchHero() {
  return (
    <LangScope lang="fr">
      <Zoom factor={HERO_ZOOM}>
        <PainHeroCard
          state="ok"
          score={6.4}
          lo={4.3}
          hi={8.1}
          trend={{ direction: 'rising', slopePerMin: 0.9 }}
          episode={{ since: '14:30:21', elapsed: '2 min 31 s' }}
          className="h-[478px]"
        />
      </Zoom>
    </LangScope>
  );
}
