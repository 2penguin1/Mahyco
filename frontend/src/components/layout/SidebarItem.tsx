import { Link, useLocation, useSearchParams } from 'react-router';
import { cn } from '@/lib/utils/cn';
import type { ReactNode } from 'react';

// All sidebar hrefs — used to pick the most specific match
const ALL_SIDEBAR_HREFS = [
  '/dashboard/dashboards/operations',
  '/dashboard/dashboards/management',
  '/dashboard/dashboards/analyzer',
  '/dashboard/playground',
  '/dashboard/batch',
  '/dashboard/exception-workbench',
  '/dashboard/exception-message-processing',
  '/dashboard/playground/arena',
  '/dashboard/history',
  '/dashboard/reports',
  '/dashboard/general',
  '/dashboard/people',
  '/dashboard/pipeline-configuration',
  '/dashboard/file-profiles',
  '/dashboard/playground/dictionary',
  '/dashboard/playground/rules',
  '/dashboard/api-keys',
  '/dashboard/security',
  '/dashboard/limits',
  '/dashboard/usage',
  '/dashboard/billing',
  '/dashboard/workbench/datasets',
  '/dashboard/workbench/gold-data',
];

// Routes that don't directly match a sidebar href but should highlight one
const ROUTE_TO_SIDEBAR: Record<string, string> = {
  '/dashboard/workbench/eval-runs': '/dashboard/workbench/datasets',
  '/dashboard/workbench/entries': '/dashboard/workbench/datasets',
  '/dashboard/playground/run': '/dashboard/history',
};

interface SidebarItemProps {
  href: string;
  icon: ReactNode;
  label: ReactNode;
  collapsed?: boolean;
}

export function SidebarItem({ href, icon, label, collapsed }: SidebarItemProps) {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');

  // For batch sub-routes (e.g. /dashboard/batch/:jobId), highlight based on tab & from:
  // - "accept" tab with from=workbench, or "verify"/"processed" tab → highlight "Exception Workbench"
  // - "accept" tab without from=workbench, or no tab → highlight "Batch Upload"
  const isBatchSubRoute = pathname.startsWith('/dashboard/batch/');
  const from = searchParams.get('from');
  let isActive: boolean;
  if (isBatchSubRoute) {
    const isMessageProcessing = from === 'message-processing';
    const isExceptionTab = !isMessageProcessing && (tab === 'verify' || tab === 'review' || tab === 'processed' || (tab === 'accept' && from === 'workbench'));
    if (href === '/dashboard/exception-message-processing') {
      isActive = isMessageProcessing;
    } else if (href === '/dashboard/exception-workbench') {
      isActive = isExceptionTab;
    } else if (href === '/dashboard/batch') {
      isActive = !isExceptionTab && !isMessageProcessing;
    } else {
      isActive = false;
    }
  } else {
    // Check mapped routes first (e.g. /dashboard/playground/run → History)
    const mappedHref = Object.entries(ROUTE_TO_SIDEBAR).find(
      ([prefix]) => pathname.startsWith(prefix)
    )?.[1];
    if (mappedHref) {
      isActive = mappedHref === href;
    } else if (pathname === href) {
      isActive = true;
    } else if (href !== '/dashboard' && (pathname.startsWith(href + '/') || pathname.startsWith(href + '?'))) {
      // Check if another sidebar href is a more specific (longer) prefix match
      const hasMoreSpecificMatch = ALL_SIDEBAR_HREFS.some(
        (other) => other !== href && other.length > href.length && pathname.startsWith(other)
      );
      isActive = !hasMoreSpecificMatch;
    } else {
      isActive = false;
    }
  }

  return (
    <Link
      to={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-(--sidebar-active) text-(--sidebar-active-text) font-medium'
          : 'text-(--text-secondary) hover:bg-(--sidebar-hover) hover:text-(--text-primary)'
      )}
      title={typeof label === 'string' ? label : undefined}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span className="flex items-center gap-2 min-w-0 truncate">{label}</span>}
    </Link>
  );
}
