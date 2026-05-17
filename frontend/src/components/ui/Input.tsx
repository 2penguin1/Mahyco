import { cn } from '@/lib/utils/cn';
import { type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, id, ...props }: InputProps) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium mb-2 text-[var(--text-primary)]">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          'w-full px-3.5 py-2.5 rounded-lg border text-sm bg-[var(--input-bg)] text-[var(--text-primary)] border-[var(--border-default)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-accent transition-colors',
          className
        )}
        {...props}
      />
    </div>
  );
}
