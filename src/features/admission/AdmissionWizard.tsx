import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProfile, type PatientProfile } from '@/store/profile';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { useL10n } from '@/i18n';

type Sex = 'Female' | 'Male' | 'Other' | 'Not recorded';
type CareSetting = 'ICU' | 'Post-op ward';
type Communication = 'Can self-report' | 'Intermittent' | 'Cannot self-report';
type Airway = 'Not intubated' | 'Intubated – controlled' | 'Intubated – spontaneous';
type CamIcu = 'Negative' | 'Positive-hypoactive' | 'Positive-hyperactive' | 'Unable to assess';

export function AdmissionWizard() {
  const navigate = useNavigate();
  const { bedId } = useParams();
  const l = useL10n();
  const [step, setStep] = useState(1);
  const setProfile = useProfile((s) => s.setProfile);

  const [profile, setLocalProfile] = useState<Partial<PatientProfile>>({
    id: `P-${Math.floor(Math.random() * 10000)}`,
    bedId: bedId ?? '',
  });

  const handleNext = () => {
    if (step === 3) {
      setProfile(profile as PatientProfile);
      navigate(`/bed/${bedId}/monitor`);
    } else {
      setStep((s) => s + 1);
    }
  };

  const isStep1Valid =
    profile.age != null &&
    profile.sex != null &&
    profile.careSetting != null &&
    profile.communication != null &&
    profile.airway != null;

  // Effect descriptions for fields
  const airwayEffect =
    profile.airway === 'Intubated – controlled'
      ? l({ en: 'Measurement · Respiration + HF-HRV disabled', fr: 'Mesure · Respiration + VFC-HF désactivés' })
      : null;

  const commEffect =
    profile.communication === 'Cannot self-report'
      ? l({ en: 'Prior · NRS disabled, CPOT/BPS required', fr: 'A priori · NRS désactivé, CPOT/BPS requis' })
      : null;

  return (
    <div className="flex h-dvh w-full items-center justify-center bg-page p-4">
      <Card className="flex h-[680px] w-full max-w-3xl flex-col p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Admission Wizard</h1>
            <p className="mt-1 text-sm text-muted">
              Bed {bedId} · Patient {profile.id}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  s === step
                    ? 'bg-accent text-white'
                    : s < step
                      ? 'bg-green-600 text-white'
                      : 'bg-subtle text-muted'
                }`}
              >
                {s < step ? '✓' : s}
              </div>
            ))}
          </div>
        </div>

        {/* Step label */}
        <div className="mt-4 rounded-lg bg-subtle px-4 py-2 text-sm font-medium text-ink">
          {step === 1 && 'Step 1 — Required (blocks monitoring start)'}
          {step === 2 && 'Step 2 — Recommended (profile incomplete badge until done)'}
          {step === 3 && 'Step 3 — Optional'}
        </div>

        {/* Form body */}
        <div className="mt-6 flex-1 overflow-y-auto pr-2">
          {step === 1 && (
            <div className="flex flex-col gap-5">
              {/* Age */}
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Age (years)</label>
                <input
                  type="number"
                  className="block w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-ink placeholder:text-muted"
                  value={profile.age ?? ''}
                  onChange={(e) =>
                    setLocalProfile((p) => ({ ...p, age: e.target.value ? parseInt(e.target.value, 10) : null }))
                  }
                  placeholder="18–110"
                  min={0}
                  max={150}
                />
              </div>

              {/* Sex */}
              <div>
                <label className="mb-2 block text-sm font-medium text-ink">Sex</label>
                <Segmented<Sex>
                  options={[
                    { value: 'Female', label: 'Female' },
                    { value: 'Male', label: 'Male' },
                    { value: 'Other', label: 'Other' },
                    { value: 'Not recorded', label: 'N/R' },
                  ]}
                  value={profile.sex ?? null}
                  onChange={(v) => setLocalProfile((p) => ({ ...p, sex: v }))}
                />
              </div>

              {/* Care Setting */}
              <div>
                <label className="mb-2 block text-sm font-medium text-ink">Care Setting</label>
                <Segmented<CareSetting>
                  options={[
                    { value: 'ICU', label: 'ICU' },
                    { value: 'Post-op ward', label: 'Post-op ward' },
                  ]}
                  value={profile.careSetting ?? null}
                  onChange={(v) => setLocalProfile((p) => ({ ...p, careSetting: v }))}
                />
              </div>

              {/* Communication */}
              <div>
                <label className="mb-2 block text-sm font-medium text-ink">Communication status</label>
                <Segmented<Communication>
                  options={[
                    { value: 'Can self-report', label: 'Can self-report' },
                    { value: 'Intermittent', label: 'Intermittent' },
                    { value: 'Cannot self-report', label: 'Cannot self-report' },
                  ]}
                  value={profile.communication ?? null}
                  onChange={(v) => setLocalProfile((p) => ({ ...p, communication: v }))}
                />
                {commEffect && (
                  <p className="mt-1 text-xs text-amber-400">⚡ {commEffect}</p>
                )}
              </div>

              {/* Airway */}
              <div>
                <label className="mb-2 block text-sm font-medium text-ink">Airway / ventilation</label>
                <Segmented<Airway>
                  options={[
                    { value: 'Not intubated', label: 'Not intubated' },
                    { value: 'Intubated – controlled', label: 'Controlled' },
                    { value: 'Intubated – spontaneous', label: 'Spontaneous' },
                  ]}
                  value={profile.airway ?? null}
                  onChange={(v) => setLocalProfile((p) => ({ ...p, airway: v }))}
                />
                {airwayEffect && (
                  <p className="mt-1 text-xs text-amber-400">⚡ {airwayEffect}</p>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5">
              {/* RASS */}
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">RASS (−5 to +4)</label>
                <input
                  type="number"
                  className="block w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-ink placeholder:text-muted"
                  value={profile.rass ?? ''}
                  onChange={(e) =>
                    setLocalProfile((p) => ({ ...p, rass: e.target.value ? parseInt(e.target.value, 10) : null }))
                  }
                  placeholder="−5 to +4"
                  min={-5}
                  max={4}
                />
                {profile.rass != null && profile.rass <= -4 && profile.communication === 'Can self-report' && (
                  <p className="mt-1 rounded bg-red-900/30 px-2 py-1 text-xs text-red-400">
                    ⚠ Contradiction: RASS ≤ −4 with "Can self-report" — please review Communication status.
                  </p>
                )}
              </div>

              {/* CAM-ICU */}
              <div>
                <label className="mb-2 block text-sm font-medium text-ink">CAM-ICU</label>
                <Segmented<CamIcu>
                  options={[
                    { value: 'Negative', label: 'Negative' },
                    { value: 'Positive-hypoactive', label: 'Hypoactive' },
                    { value: 'Positive-hyperactive', label: 'Hyperactive' },
                    { value: 'Unable to assess', label: 'Unable' },
                  ]}
                  value={profile.camIcu ?? null}
                  onChange={(v) => setLocalProfile((p) => ({ ...p, camIcu: v }))}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-5">
              {/* Surgery reason */}
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Surgery reason (optional)</label>
                <input
                  type="text"
                  className="block w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-ink placeholder:text-muted"
                  value={profile.surgeryReason ?? ''}
                  onChange={(e) => setLocalProfile((p) => ({ ...p, surgeryReason: e.target.value }))}
                  placeholder="e.g. Total knee replacement"
                />
              </div>

              {/* Time since surgery */}
              <div>
                <label className="mb-1 block text-sm font-medium text-ink">Time since surgery (hours)</label>
                <input
                  type="number"
                  className="block w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-ink placeholder:text-muted"
                  value={profile.timeSinceSurgery ?? ''}
                  onChange={(e) =>
                    setLocalProfile((p) => ({
                      ...p,
                      timeSinceSurgery: e.target.value ? parseFloat(e.target.value) : null,
                    }))
                  }
                  placeholder="e.g. 2.5"
                  min={0}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <div className="text-xs text-muted">
            {step === 1 && !isStep1Valid && 'Fill all required fields to continue'}
            {step === 1 && isStep1Valid && 'Ready to continue'}
            {step === 2 && 'You can skip — these fields improve accuracy'}
            {step === 3 && 'Ready to start monitoring'}
          </div>
          <div className="flex gap-3">
            {step > 1 && (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
            {step === 2 && (
              <Button variant="ghost" onClick={() => setStep(3)}>
                Skip
              </Button>
            )}
            <Button variant="primary" onClick={handleNext} disabled={step === 1 && !isStep1Valid}>
              {step === 3 ? 'Start monitoring' : 'Next'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
