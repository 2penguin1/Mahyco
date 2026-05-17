
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  hint?: string;
}

export function Toggle({ checked, onChange, disabled, label, hint }: ToggleProps) {
  const Switch = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none shrink-0"
      style={{
        background: checked ? 'var(--color-success)' : 'var(--border-default)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(3px)' }}
      />
    </button>
  );

  if (hint) {
    return (
      <label className="flex items-start gap-3 cursor-pointer py-1">
        {Switch}
        <div className="min-w-0">
          {label && <div className="text-sm text-[var(--text-primary)]">{label}</div>}
          <div className="text-xs text-[var(--text-muted)] mt-0.5 leading-snug">{hint}</div>
        </div>
      </label>
    );
  }

  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      {Switch}
      {label && <span className="text-sm text-[var(--text-primary)]">{label}</span>}
    </label>
  );
}
