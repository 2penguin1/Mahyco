import { Link } from 'react-router';
import { Fragment } from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  id?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-2 text-base min-w-0 ${className}`}
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const linkable = !isLast && item.href;

        return (
          <Fragment key={`${i}-${item.label}`}>
            <div className="flex items-center gap-1.5 min-w-0">
              {linkable ? (
                <Link
                  to={item.href!}
                  className="truncate text-[var(--text-muted)] hover:text-[var(--text-primary)] no-underline transition-colors"
                  title={item.label}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={`truncate ${
                    isLast
                      ? 'font-medium text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)]'
                  }`}
                  title={item.label}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
              {item.id && (
                <span className="text-sm font-mono text-[var(--text-muted)] shrink-0">
                  [{item.id}]
                </span>
              )}
            </div>
            {!isLast && (
              <span
                className="text-[var(--text-muted)] opacity-60 select-none shrink-0"
                aria-hidden="true"
              >
                /
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
