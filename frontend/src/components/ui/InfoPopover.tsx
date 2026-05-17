import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface InfoPopoverProps {
  content: ReactNode;
  className?: string;
}

export function InfoPopover({ content, className = '' }: InfoPopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div
      ref={ref}
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-full p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1"
        aria-label={t('infoPopover.moreInformation')}
      >
        <Info size={18} />
      </button>
      {open && (
        <div className="absolute left-full ml-2 top-0 z-50 w-64 rounded-lg border border-[var(--border-default)] bg-[var(--surface)] p-3 text-xs text-[var(--text-secondary)] shadow-lg">
          {content}
        </div>
      )}
    </div>
  );
}
