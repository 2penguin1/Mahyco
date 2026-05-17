import { useState, useRef, useEffect } from 'react';
import {
  ChevronDown, LogOut, User, Search, Bell, PanelLeft, Leaf,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useDashboard } from '@/lib/context/DashboardContext';
import { useNavigate } from 'react-router';
import { useAuth } from '@/lib/providers/AuthProvider';

function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0]?.slice(0, 2).toUpperCase() ?? '?';
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return '?';
}

export function TopBar() {
  const { toggleSidebar, sidebarCollapsed } = useDashboard();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('topbar-search')?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const initials = getInitials(user?.full_name, user?.email);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
  };

  return (
    <header className="sticky top-0 z-[100] relative flex flex-wrap md:flex-nowrap items-center h-auto md:h-14 pl-0 pr-4 py-2 md:py-0 border-b border-[var(--border-default)] bg-[var(--surface)]">
      {/* ── Brand rail ── */}
      <div className="flex items-center shrink-0 transition-all px-4 w-56 max-sm:w-auto">
        <button
          onClick={toggleSidebar}
          className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors"
          aria-label="Toggle sidebar"
        >
          <PanelLeft size={17} className={sidebarCollapsed ? 'opacity-80' : ''} />
        </button>
        <div className="flex items-center gap-3 ml-2">
          <div
            className="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
          >
            <Leaf size={16} className="text-white" />
          </div>
          <span className="text-[17px] font-bold text-[var(--text-primary)] tracking-tight whitespace-nowrap">
            Mahyco
          </span>
        </div>
      </div>
      <div className="hidden md:block h-5 w-px bg-[var(--border-default)] mr-4 shrink-0" />

      {/* ── Center: Search ── */}
      <div className="order-3 md:order-none w-full md:flex-1 md:min-w-0 mt-2 md:mt-0 md:mx-4 px-4 md:px-0 flex justify-center">
        <div className="relative w-full md:max-w-[480px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
          <input
            id="topbar-search"
            type="text"
            placeholder="Search analyses, history…"
            className="w-full h-9 pl-9 pr-9 md:pr-14 text-[13px] bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
          />
          <kbd className="hidden md:inline-flex absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)] bg-[var(--bg)] px-1.5 py-0.5 rounded border border-[var(--border-default)] leading-none font-sans">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-1 ml-auto shrink-0">
        <ThemeToggle />

        <button
          className="relative inline-flex items-center justify-center h-8 w-8 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors"
          aria-label="Notifications"
        >
          <Bell size={16} />
        </button>

        {/* Divider */}
        <div className="h-5 w-px bg-[var(--border-default)] mx-1.5 shrink-0" />

        {/* User */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="inline-flex items-center gap-2.5 h-9 pl-1.5 pr-2.5 rounded-lg hover:bg-[var(--surface-raised)] transition-colors"
          >
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white shrink-0"
              style={{ background: user?.picture ? undefined : 'linear-gradient(135deg, #16a34a, #15803d)' }}
            >
              {user?.picture && !imgError ? (
                <img src={user.picture} alt={user.full_name ?? 'User'} className="h-full w-full rounded-full object-cover" onError={() => setImgError(true)} />
              ) : initials}
            </div>
            <div className="hidden md:block text-left leading-tight">
              <div className="text-[12px] font-semibold text-[var(--text-primary)] truncate max-w-[90px]">
                {user?.full_name ?? 'User'}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] mt-px capitalize">{user?.role ?? 'user'}</div>
            </div>
            <ChevronDown size={12} className="text-[var(--text-muted)] hidden md:block ml-0.5" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 mt-1.5 w-60 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] overflow-hidden z-[999]"
              style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.15)' }}
            >
              <div className="px-4 py-3 border-b border-[var(--border-default)]">
                <div className="flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold text-white"
                    style={{ background: user?.picture ? undefined : 'linear-gradient(135deg, #16a34a, #15803d)' }}
                  >
                    {user?.picture && !imgError ? (
                      <img src={user.picture} alt={user.full_name ?? 'User'} className="h-full w-full rounded-full object-cover" onError={() => setImgError(true)} />
                    ) : initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{user?.full_name ?? 'User'}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">{user?.email ?? ''}</p>
                  </div>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => { setMenuOpen(false); navigate('/dashboard/profile'); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <User size={15} /> Profile
                </button>

                <div className="border-t border-[var(--border-default)] mt-1" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-danger hover:bg-[var(--surface-raised)] transition-colors"
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
