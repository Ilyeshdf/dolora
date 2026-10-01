import { useT } from '@/i18n';
import { Footer } from '@/components/ui/Brand';
import { Card } from '@/components/ui/Card';
import { Header } from '@/features/header/Header';
import { cn } from '@/lib/cn';
import { useCompact } from './useCompact';

/** Screens scheduled for Phase 5 (Unit overview, Timeline tab, Assessments tab). */
export function Placeholder({ title }: { title: string }) {
  const t = useT();
  const compact = useCompact();
  return (
    <div className={cn('themed-page flex h-dvh flex-col', compact && 'compact')}>
      <Header />
      <main className="grid flex-1 place-items-center px-8">
        <Card className="max-w-[560px] text-center">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-2 text-md text-text-2">{t.common.comingLater}</p>
        </Card>
      </main>
      <Footer className="h-[41px]" />
    </div>
  );
}
