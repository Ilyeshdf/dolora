import { Link } from 'react-router-dom';
import { UserRoundPlus } from 'lucide-react';
import { useT } from '@/i18n';
import { cn } from '@/lib/cn';
import { Footer, Wordmark } from '@/components/ui/Brand';
import { Card } from '@/components/ui/Card';
import { buttonClass } from '@/components/ui/buttonClass';
import { Tier } from '@/features/entry/common';
import { useCompact } from './useCompact';

/** A bed without the required profile fields cannot start monitoring (task §3.3). */
export function ProfileRequired({ bedId }: { bedId: string }) {
  const t = useT();
  const compact = useCompact();
  return (
    <div className={cn('themed-page flex h-dvh flex-col', compact && 'compact')}>
      <header className="flex h-18 items-center px-8">
        <Wordmark />
      </header>
      <main className="grid flex-1 place-items-center px-8">
        <Card className="w-[560px] max-w-full">
          <Tier tier="required">{t.entry.profileRequired}</Tier>
          <h1 className="mt-3 text-3xl font-bold">{t.entry.admitSub(bedId)}</h1>
          <p className="mt-3 text-md text-text-2">{t.entry.profileRequiredBody}</p>
          <Link to={`/bed/${bedId}/admit`} className={cn(buttonClass({ size: 'lg' }), 'mt-6')}>
            <UserRoundPlus aria-hidden size={20} strokeWidth={1.75} />
            {t.entry.startAdmission}
          </Link>
        </Card>
      </main>
      <Footer className="h-[41px]" />
    </div>
  );
}
