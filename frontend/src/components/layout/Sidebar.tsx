import { LayoutDashboard, User, Layers, Tent, History, Settings } from 'lucide-react';
import { useDashboard } from '@/lib/context/DashboardContext';
import { SidebarItem } from './SidebarItem';
import { SidebarSection } from './SidebarSection';

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useDashboard();

  return (
    <aside
      data-sidebar="true"
      onDoubleClick={toggleSidebar}
      className="fixed left-0 top-14 bottom-0 z-40 flex flex-col border-r border-(--border-default) bg-(--sidebar-bg) transition-all"
      style={{ width: sidebarCollapsed ? 64 : 224 }}
    >
      <nav className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto px-2 py-3 space-y-1">
          <SidebarSection
            label="Main"
            collapsed={sidebarCollapsed}
            open={true}
            onToggle={() => {}}
          >
            <SidebarItem href="/dashboard" icon={<LayoutDashboard size={18} />} label="Dashboard" collapsed={sidebarCollapsed} />
            <SidebarItem href="/dashboard/batch" icon={<Layers size={18} />} label="Batch Processing" collapsed={sidebarCollapsed} />
            <SidebarItem href="/dashboard/playground" icon={<Tent size={18} />} label="Playground" collapsed={sidebarCollapsed} />
            <SidebarItem href="/dashboard/history" icon={<History size={18} />} label="History" collapsed={sidebarCollapsed} />
            <SidebarItem href="/dashboard/settings" icon={<Settings size={18} />} label="Settings" collapsed={sidebarCollapsed} />
            <SidebarItem href="/dashboard/profile" icon={<User size={18} />} label="Profile" collapsed={sidebarCollapsed} />
          </SidebarSection>
        </div>
      </nav>
    </aside>
  );
}
