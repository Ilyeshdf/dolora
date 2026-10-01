import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { Toaster } from '@/components/ui/Toast';
import { ComponentsPage } from '@/dev/ComponentsPage';
import { ThemeSync } from './ThemeSync';

export function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeSync />
      <TooltipProvider delayDuration={200}>
        <Routes>
          <Route path="/dev/components" element={<ComponentsPage />} />
          {/* Phase 1: the clinical screens arrive in Phase 2. */}
          <Route path="*" element={<Navigate to="/dev/components" replace />} />
        </Routes>
        <Toaster />
      </TooltipProvider>
    </BrowserRouter>
  );
}
