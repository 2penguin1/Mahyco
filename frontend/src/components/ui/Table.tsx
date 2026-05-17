import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils/cn';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  /** If set, column is sticky on horizontal scroll; value is CSS left (e.g. '0', '12rem') */
  stickyLeft?: string;
  /** If true, column header is clickable and triggers sorting */
  sortable?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  /** Optional per-row class name based on the row item (for highlighting, disabled states, etc.) */
  rowClassName?: (item: T) => string | undefined;
  emptyMessage?: string;
  /** Optional className for the scroll container */
  containerClassName?: string;
  /** Current sort column key */
  sortBy?: string;
  /** Current sort order: 'asc' or 'desc' */
  sortOrder?: 'asc' | 'desc';
  /** Callback when sort changes: (columnKey: string, order: 'asc' | 'desc') => void */
  onSort?: (columnKey: string, order: 'asc' | 'desc') => void;
}

export function Table<T extends object>({
  columns,
  data,
  onRowClick,
  rowClassName,
  emptyMessage,
  containerClassName,
  sortBy,
  sortOrder,
  onSort,
}: TableProps<T>) {
  const { t } = useTranslation();
  const resolvedEmptyMessage = emptyMessage ?? t('ui.table.noDataFound');

  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-[var(--text-muted)]">
        {resolvedEmptyMessage}
      </div>
    );
  }

  const handleSort = (columnKey: string) => {
    if (!onSort) return;
    if (sortBy === columnKey) {
      // Toggle order if same column
      onSort(columnKey, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      onSort(columnKey, 'asc');
    }
  };

  return (
    <div className={cn('overflow-x-auto', containerClassName)}>
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10 bg-[var(--surface)]">
          <tr className="border-b border-[var(--border-default)]">
            {columns.map((col) => {
              const isSorted = sortBy === col.key;
              const isSortable = col.sortable && !!onSort;
              
              return (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]',
                    col.stickyLeft != null && 'sticky z-[1] bg-[var(--surface-default)] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]',
                    isSortable && 'cursor-pointer hover:bg-[var(--surface-raised)] select-none',
                    col.className
                  )}
                  style={col.stickyLeft != null ? { left: col.stickyLeft } : undefined}
                  onClick={isSortable ? () => handleSort(col.key) : undefined}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {isSortable && (
                      <span className="inline-flex flex-col items-center justify-center">
                        {isSorted && sortOrder === 'asc' ? (
                          <ArrowUp size={12} className="text-[var(--text-primary)]" />
                        ) : isSorted && sortOrder === 'desc' ? (
                          <ArrowDown size={12} className="text-[var(--text-primary)]" />
                        ) : (
                          <span className="flex flex-col -space-y-0.5">
                            <ArrowUp size={10} className="text-[var(--text-muted)] opacity-40" />
                            <ArrowDown size={10} className="text-[var(--text-muted)] opacity-40" />
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(item)}
              className={cn(
                'border-b border-[var(--border-subtle)] transition-colors group',
                onRowClick && 'cursor-pointer hover:bg-[var(--surface-raised)]',
                rowClassName?.(item)
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-sm text-[var(--text-primary)]',
                    col.stickyLeft != null && 'sticky z-[1] bg-[var(--surface-default)] dark:bg-[var(--surface-default)] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)] group-hover:bg-[var(--surface-raised)]',
                    col.className
                  )}
                  style={col.stickyLeft != null ? { left: col.stickyLeft } : undefined}
                >
                  {col.render
                    ? col.render(item)
                    : String((item as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
