import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { Toaster } from '@/components/ui/Toast';
import { ComponentsPage } from '@/dev/ComponentsPage';
import { MonitorPage } from '@/features/monitor/MonitorPage';
import { AdmissionWizard } from '@/features/admission/AdmissionWizard';
import { UnitPage } from '@/features/unit/UnitPage';
import { TimelinePage } from '@/features/timeline/TimelinePage';
import { AssessmentsPage } from '@/features/assessments/AssessmentsPage';
import { AuditTrailPage } from '@/features/audit/AuditTrailPage';
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
  return (
    <Routes>
      <Route path="/dev/components" element={<ComponentsPage />} />
      <Route path="/bed/:bedId/monitor" element={<MonitorPage />} />
      <Route path="/bed/:bedId/timeline" element={<TimelinePage />} />
      <Route path="/bed/:bedId/assessments" element={<AssessmentsPage />} />
      <Route path="/bed/:bedId/audit" element={<AuditTrailPage />} />
      <Route path="/bed/:bedId/admission" element={<AdmissionWizard />} />
      <Route path="/unit" element={<UnitPage />} />
      <Route path="*" element={<Navigate to="/bed/4/monitor" replace />} />
    </Routes>
  );
}

