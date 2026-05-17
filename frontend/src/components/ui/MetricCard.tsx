import { Card } from './Card';

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
}

export function MetricCard({ label, value, change, changeType = 'neutral', icon }: MetricCardProps) {
  const changeColor =
    changeType === 'positive' ? 'text-success' : changeType === 'negative' ? 'text-danger' : 'text-[var(--text-muted)]';

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
          {change && <p className={`mt-1 text-xs font-medium ${changeColor}`}>{change}</p>}
        </div>
        {icon && <div className="text-[var(--text-muted)]">{icon}</div>}
      </div>
    </Card>
  );
}
