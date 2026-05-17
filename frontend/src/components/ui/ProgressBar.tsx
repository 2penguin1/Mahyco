interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showPercentage?: boolean;
  color?: string;
}

export function ProgressBar({
  value,
  max,
  label,
  showPercentage = true,
  color = 'var(--color-accent)',
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-xs text-[var(--text-secondary)]">{label}</span>}
          {showPercentage && (
            <span className="text-xs font-mono text-[var(--text-muted)]">{percentage.toFixed(0)}%</span>
          )}
        </div>
      )}
      <div className="h-2 rounded-full bg-[var(--surface-raised)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${percentage}%`, background: color }}
        />
      </div>
    </div>
  );
}
