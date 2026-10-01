import * as RT from '@radix-ui/react-toast';
import { CircleCheck, X } from 'lucide-react';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { useToasts, type ToastItem } from './toastStore';

export function ToastCard({ item, onClose, className }: { item: ToastItem; onClose?: () => void; className?: string }) {
  const t = useT();
  return (
    <div
      className={cn(
        'flex w-[440px] items-center gap-3 rounded-tip bg-pill-active px-4 py-3 text-pill-active-fg shadow-card hc:border-2 hc:border-card',
        className,
      )}
    >
      <CircleCheck aria-hidden size={20} strokeWidth={1.75} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{item.title}</p>
        {item.description ? <p className="text-sm opacity-80">{item.description}</p> : null}
      </div>
      {item.action ? (
        <button
          type="button"
          onClick={item.action.onAction}
          className="nowrap rounded-full px-3 py-1.5 text-sm font-semibold underline underline-offset-4 hover:no-underline"
        >
          {item.action.label}
        </button>
      ) : null}
      {onClose ? (
        <button type="button" aria-label={t.common.close} onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-pill-active-fg/10">
          <X aria-hidden size={16} />
        </button>
      ) : null}
    </div>
  );
}

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <RT.Provider swipeDirection="down">
      {toasts.map((item) => (
        <RT.Root
          key={item.id}
          duration={item.action ? 10_000 : 5_000}
          onOpenChange={(open) => {
            if (!open) dismiss(item.id);
          }}
          asChild
        >
          <li>
            <RT.Title className="sr-only">{item.title}</RT.Title>
            <ToastCard
              item={{
                ...item,
                action: item.action && {
                  ...item.action,
                  onAction: () => {
                    item.action?.onAction();
                    dismiss(item.id);
                  },
                },
              }}
              onClose={() => dismiss(item.id)}
            />
          </li>
        </RT.Root>
      ))}
      <RT.Viewport className="fixed bottom-12 left-1/2 z-[60] flex -translate-x-1/2 flex-col gap-2 outline-none" />
    </RT.Provider>
  );
}
