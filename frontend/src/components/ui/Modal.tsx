
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useDashboard } from '@/lib/context/DashboardContext';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Renders next to the title (e.g. info icon with tooltip) */
  titleExtra?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'fullscreen';
  showHeader?: boolean;
  excludeSidebar?: boolean;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw]',
  fullscreen: 'w-full h-full max-w-full max-h-full',
};

export function Modal({ open, onClose, title, titleExtra, children, footer, size = 'md', showHeader = true, excludeSidebar = false }: ModalProps) {
  const { sidebarCollapsed } = useDashboard();
  
  if (!open) return null;

  const isFullscreen = size === 'fullscreen';
  const sidebarWidth = sidebarCollapsed ? 64 : 224;

  return (
    <div
      className="fixed z-[1000] flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0,0,0,0.5)',
        ...(isFullscreen && excludeSidebar
          ? {
              left: `${sidebarWidth}px`,
              top: 0,
              right: 0,
              bottom: 0,
              padding: '64px',
            }
          : {
              inset: 0,
              padding: '16px',
            }),
      }}
      onClick={onClose}
    >
      <div
        className={`${isFullscreen ? 'w-full h-full' : `w-full ${sizeClasses[size]}`} rounded-xl border border-[var(--border-default)] bg-[var(--surface)] flex flex-col`}
        style={{ 
          boxShadow: 'var(--shadow-elevated, 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1))',
          maxHeight: isFullscreen ? '100%' : '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {showHeader && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)] flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {title && <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>}
              {titleExtra}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-raised)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className={`flex-1 overflow-y-auto flex flex-col ${isFullscreen ? '' : 'px-6 py-4'}`}>{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border-default)] bg-[var(--surface-raised)] rounded-b-xl flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
