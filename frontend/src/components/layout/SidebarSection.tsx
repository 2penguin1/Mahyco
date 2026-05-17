import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

interface SidebarSectionProps {
  label: ReactNode;
  children: ReactNode;
  collapsed?: boolean;
  open?: boolean;
  onToggle?: () => void;
  className?: string;
}

export function SidebarSection({ label, children, collapsed, open = true, onToggle, className }: SidebarSectionProps) {
  const isCollapsible = !collapsed && typeof onToggle === 'function';

  return (
    <div className={cn('mb-2', className)}>
      {!collapsed && (
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'w-full px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-(--text-muted)',
            isCollapsible && 'flex items-center justify-between rounded-md hover:bg-(--sidebar-hover)'
          )}
        >
          <span className="flex items-center gap-2 min-w-0">{label}</span>
          {isCollapsible && (
            <ChevronDown
              size={16}
              className={cn('shrink-0 transition-transform', open ? 'rotate-0' : '-rotate-90')}
              aria-hidden="true"
            />
          )}
        </button>
      )}
      {(collapsed || open) && <div className="space-y-0.5">{children}</div>}
    </div>
  );
}
