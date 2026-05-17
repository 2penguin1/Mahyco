import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  actions?: ReactNode;
}

export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-60 bg-(--bg) shadow-[0_-24px_0_0_var(--bg),0_12px_0_0_var(--bg)] flex items-start justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-(--text-primary)">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
