import { Outlet } from 'react-router';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { DashboardProvider, useDashboard } from '@/lib/context/DashboardContext';
import { PipelineSettingsProvider } from '@/lib/context/PipelineSettingsContext';

function DashboardShell() {
  const { sidebarCollapsed } = useDashboard();

  return (
    <div className="h-screen overflow-hidden bg-(--bg)">
      <TopBar />
      <Sidebar />
      <main
        style={{
          marginLeft: sidebarCollapsed ? 64 : 224,
          height: 'calc(100vh - 3.5rem)',
        }}
        className="transition-all p-6 flex flex-col min-h-0 overflow-auto"
      >
        <Outlet />
      </main>
    </div>
  );
}

export default function DashboardLayout() {
  return (
    <DashboardProvider>
      <PipelineSettingsProvider>
        <DashboardShell />
      </PipelineSettingsProvider>
    </DashboardProvider>
  );
}
