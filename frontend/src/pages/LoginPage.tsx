import { useState } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { Leaf, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

type Mode = 'login' | 'register';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  // login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // register extra fields
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({ email, password, full_name: fullName, role: 'user' });
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex">
      {/* Left — Branding Panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] flex-col justify-between border-r border-[var(--border-default)] bg-[var(--sidebar-bg)] p-12 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #16a34a 0%, transparent 70%)' }} />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-5" style={{ background: 'radial-gradient(circle, #15803d 0%, transparent 70%)' }} />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
              <Leaf size={20} className="text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Mahyco</span>
              <div className="text-xs text-[var(--text-muted)] -mt-0.5">AgriTech Platform</div>
            </div>
          </div>
        </div>

        <div className="relative space-y-10">
          <div>
            <h2 className="text-3xl font-bold text-[var(--text-primary)] leading-tight">
              Smart Disease Detection<br />
              <span className="text-accent">for Modern Agriculture</span>
            </h2>
            <p className="mt-4 text-[var(--text-muted)] text-sm leading-relaxed">
              Mahyco's AI-powered platform helps farmers and agronomists detect crop diseases early, 
              analyze plant health, and make data-driven decisions to maximize yield.
            </p>
          </div>

          <div className="space-y-6">
            {[
              { emoji: '🌿', title: 'AI-Powered Analysis', desc: 'Upload drone or field images and get instant disease classification with confidence scores.' },
              { emoji: '📊', title: 'Detailed Reports', desc: 'View chunk-level breakdowns of healthy, mild, and severely infected areas across your crop.' },
              { emoji: '📜', title: 'Full History', desc: 'Track every analysis over time with downloadable JSON reports for record keeping.' },
            ].map(f => (
              <div key={f.title} className="flex gap-4">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-xl">
                  {f.emoji}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-[var(--text-muted)]">
          © {new Date().getFullYear()} Mahyco. All rights reserved.
        </p>
      </div>

      {/* Right — Auth Card */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px] space-y-8">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
              <Leaf size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Mahyco</span>
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {mode === 'login'
                ? 'Sign in to access your Mahyco dashboard'
                : 'Get started with the Mahyco platform'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--border-default)] bg-[var(--surface)] p-6 space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full h-10 px-3 text-sm bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20 transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-10 px-3 text-sm bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 pl-3 pr-10 text-sm bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Confirm Password</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 px-3 text-sm bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/20 transition-all"
                />
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/20 text-sm text-[var(--color-danger)]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg h-11 text-sm font-medium text-white transition-colors disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Sign in' : 'Create account'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--text-muted)]">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
              className="text-accent hover:text-accent-hover font-medium transition-colors"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
