import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Sparkles, Layers } from 'lucide-react';
import { Anatomy3DView } from './Anatomy3DView';
import { MUSCLE_REGISTRY } from './muscleModel';
import { useView } from '@/features/monitor/useView';
import { cn } from '@/lib/cn';

interface Anatomy3DStudioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Anatomy3DStudioDialog({ open, onOpenChange }: Anatomy3DStudioDialogProps) {
  const view = useView();
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const muscleList = Object.values(MUSCLE_REGISTRY).filter((m) =>
    activeFilter === 'all' ? true : m.group === activeFilter,
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed inset-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-card-outline bg-bg shadow-2xl md:inset-8">
          {/* Header */}
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-card-outline px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <Sparkles size={20} />
              </div>
              <div>
                <Dialog.Title className="text-lg font-bold text-text-1">
                  3D Muscled Anatomy & Physiological Mapping Studio
                </Dialog.Title>
                <Dialog.Description className="text-xs text-text-2">
                  Interactive real-time 3D muscular biomechanics, nociceptive motor reflexes, and sensor site geometry
                </Dialog.Description>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 rounded-full border border-card-outline bg-card px-3 py-1 text-xs font-semibold text-text-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Bed 4 Telemetry Synced
              </span>
              <Dialog.Close className="rounded-lg p-2 text-text-2 transition hover:bg-subtle hover:text-text-1">
                <X size={20} />
              </Dialog.Close>
            </div>
          </div>

          {/* Main Studio Body: 3D Viewport on Left (70%), Anatomy Breakdown on Right (30%) */}
          <div className="flex flex-1 overflow-hidden">
            {/* 3D Canvas Area */}
            <div className="relative flex-1 bg-gradient-to-b from-card/30 to-bg">
              <Anatomy3DView className="h-full w-full" interactive={true} />
            </div>

            {/* Right Side Anatomy Inspector Panel */}
            <div className="flex w-96 flex-col border-l border-card-outline bg-card/60 backdrop-blur-md">
              <div className="border-b border-card-outline p-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-text-1">
                  <Layers size={16} className="text-accent" />
                  Muscle Groups & Nociceptive Sites
                </h3>
                {/* Filter Tabs */}
                <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                  {['all', 'chest', 'core', 'head', 'arm', 'leg', 'back'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveFilter(cat)}
                      className={cn(
                        'rounded-lg px-2.5 py-1 font-semibold capitalize transition',
                        activeFilter === cat
                          ? 'bg-accent text-accent-contrast'
                          : 'bg-subtle text-text-2 hover:bg-card-outline hover:text-text-1',
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Muscle Registry Scroll Area */}
              <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
                {muscleList.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-card-outline bg-card/80 p-3 shadow-xs transition hover:border-accent/40"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-text-1 text-sm">{m.name}</span>
                      <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent uppercase">
                        {m.group}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] italic text-text-2">{m.latinName}</p>
                    <p className="mt-2 text-xs text-text-2">{m.function}</p>
                    <div className="mt-2.5 rounded-lg border border-accent/20 bg-accent/5 p-2 text-[11px] leading-relaxed text-text-1">
                      <span className="font-semibold text-accent">Clinical Pain Correlation: </span>
                      {m.clinicalSignificance}
                    </div>
                  </div>
                ))}
              </div>

              {/* Live Signal Summary Footer */}
              <div className="border-t border-card-outline bg-card p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-1">Nociceptive Stress Correlation</span>
                  <span className="font-bold text-accent">
                    {view?.pain ? `${view.pain.score.toFixed(1)} / 10` : 'Normal'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-text-2">
                  Facial grimace (corrugator) & autonomic vasoconstriction actively mapped to 3D surface electrodes.
                </p>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
