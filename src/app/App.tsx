import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useT } from '@/i18n';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { Toaster } from '@/components/ui/Toast';
import { ComponentsPage } from '@/dev/ComponentsPage';
import { MonitorPage } from '@/features/monitor/MonitorPage';
import { Placeholder } from '@/features/monitor/Placeholder';
import { ThemeSync } from './ThemeSync';

export function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeSync />
      <TooltipProvider delayDuration={200}>
        <AppRoutes />
        <Toaster />
      </TooltipProvider>
    </BrowserRouter>
  );
}

function AppRoutes() {
  const t = useT();
  return (
    <Routes>
      <Route path="/dev/components" element={<ComponentsPage />} />
      <Route path="/bed/:bedId/monitor" element={<MonitorPage />} />
      <Route path="/bed/:bedId/timeline" element={<Placeholder title={t.nav.timeline} />} />
      <Route path="/bed/:bedId/assessments" element={<Placeholder title={t.nav.assessments} />} />
      <Route path="/unit" element={<Placeholder title={t.nav.unit} />} />
      <Route path="*" element={<Navigate to="/bed/4/monitor" replace />} />
    </Routes>
  );
}
