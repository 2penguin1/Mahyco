import { createContext, useContext, useState, type ReactNode } from 'react';

interface DashboardContextType {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const DashboardContext = createContext<DashboardContextType>({
  sidebarCollapsed: false,
  toggleSidebar: () => {},
  setSidebarCollapsed: () => {},
});

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
  });

  return (
    <DashboardContext.Provider
      value={{
        sidebarCollapsed,
        toggleSidebar: () => setSidebarCollapsedState(prev => {
          const next = !prev;
          try { localStorage.setItem('sidebar-collapsed', String(next)); } catch {}
          return next;
        }),
        setSidebarCollapsed: (v: boolean) => {
          setSidebarCollapsedState(v);
          try { localStorage.setItem('sidebar-collapsed', String(v)); } catch {}
        },
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  return useContext(DashboardContext);
}
