import { useState } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Mail, Shield, LogOut } from 'lucide-react';

function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0]?.slice(0, 2).toUpperCase() ?? '?';
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return '?';
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [imgError, setImgError] = useState(false);

  return (
    <div>
      <PageHeader title="Profile" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Avatar card */}
        <Card className="p-6 flex flex-col items-center text-center">
          <div
            className="h-20 w-20 rounded-full overflow-hidden flex items-center justify-center text-white text-2xl font-semibold"
            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
          >
            {user?.picture && !imgError ? (
              <img
                src={user.picture}
                alt={user.full_name ?? 'User'}
                className="h-full w-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              getInitials(user?.full_name, user?.email)
            )}
          </div>

          <h2 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
            {user?.full_name ?? 'User'}
          </h2>
          <p className="text-sm text-[var(--text-muted)]">{user?.email}</p>

          <div className="mt-3">
            <Badge variant="success">Active</Badge>
          </div>

          <div className="mt-6 w-full pt-4 border-t border-[var(--border-default)]">
            <Button
              variant="danger"
              className="w-full"
              onClick={logout}
            >
              <LogOut size={16} />
              Sign Out
            </Button>
          </div>
        </Card>

        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Account Details</h3>
            <div className="divide-y divide-[var(--border-subtle)]">
              {user?.email && (
                <div className="flex items-start gap-3 py-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-raised)]">
                    <Mail size={16} className="text-[var(--text-muted)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--text-muted)]">Email</p>
                    <p className="text-sm text-[var(--text-primary)] break-all">{user.email}</p>
                  </div>
                </div>
              )}
              {user?.role && (
                <div className="flex items-start gap-3 py-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-raised)]">
                    <Shield size={16} className="text-[var(--text-muted)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--text-muted)]">Role</p>
                    <p className="text-sm text-[var(--text-primary)] capitalize">{user.role}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
