import { cn } from '@/lib/utils/cn';
import { type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className, id, ...props }: SelectProps) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium mb-2 text-[var(--text-primary)]">
          {label}
        </label>
      )}
      <select
        id={id}
        className={cn(
          'w-full px-3.5 py-2.5 rounded-lg border text-sm bg-[var(--input-bg)] text-[var(--text-primary)] border-[var(--border-default)] focus:outline-none focus:border-accent transition-colors',
          className
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
