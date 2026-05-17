import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';

const PAGE_SIZE_OPTIONS = [
  { value: '5', label: '5' },
  { value: '10', label: '10' },
  { value: '20', label: '20' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
];

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  total?: number;
  showPageSizeSelector?: boolean;
}

export function PaginationControls({
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  total,
  showPageSizeSelector = false,
}: PaginationControlsProps) {
  const { t } = useTranslation();
  const safeTotalPages = totalPages || 1;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)]">{t('ui.pagination.rowsPerPage')}</span>
            <select
              value={String(pageSize)}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="w-16 rounded-md border border-[var(--border-default)] bg-[var(--input-bg)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:border-accent focus:outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {total != null && (
          <span className="text-xs text-[var(--text-muted)]">{total} {t('ui.pagination.total')}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          {t('ui.pagination.previous')}
        </Button>
        <span className="text-xs text-[var(--text-muted)]">
          {t('ui.pagination.pageOf', { page, total: safeTotalPages })}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(Math.min(safeTotalPages, page + 1))}
          disabled={page >= safeTotalPages}
        >
          {t('ui.pagination.next')}
        </Button>
      </div>
    </div>
  );
}
