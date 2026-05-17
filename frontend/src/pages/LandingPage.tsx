import { useNavigate } from 'react-router';
import { Leaf, Shield, ArrowRight, ChevronRight, Zap, Globe, Users, FlaskConical, Sprout, Wheat } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)] overflow-x-hidden">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 border-b border-[var(--border-default)] bg-[var(--bg)]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
              <Leaf size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">Mahyco</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="h-9 px-4 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate('/login')}
              className="h-9 px-4 text-sm font-medium text-white rounded-lg transition-colors"
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-24 pb-32 px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] opacity-20 blur-3xl rounded-full" style={{ background: 'radial-gradient(ellipse, #16a34a 0%, transparent 70%)' }} />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent text-xs font-medium mb-8">
            <Zap size={12} />
            Since 1964 • Research-Driven Seed Innovation
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
            Science-led Seeds for<br />
            <span style={{ background: 'linear-gradient(135deg, #16a34a, #4ade80)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Better Farmer Outcomes
            </span>
          </h1>

          <p className="mt-6 text-lg text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed">
            Mahyco (Maharashtra Hybrid Seeds Company) is one of India&apos;s pioneering seed companies,
            focused on research, breeding, production, and delivery of high-performance seeds for field and vegetable crops.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center justify-center gap-2 h-12 px-8 text-sm font-semibold text-white rounded-xl transition-all hover:opacity-90 hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 4px 20px rgba(22, 163, 74, 0.3)' }}
            >
              Explore Platform
              <ArrowRight size={16} />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center justify-center gap-2 h-12 px-8 text-sm font-semibold text-[var(--text-primary)] rounded-xl border border-[var(--border-default)] hover:bg-[var(--surface-raised)] transition-colors"
            >
              Sign in to Dashboard
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Company Snapshot ── */}
      <section className="py-16 px-6 border-y border-[var(--border-default)] bg-[var(--surface)]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: 'Founded', value: '1964' },
            { label: 'Crop Portfolio', value: '30+' },
            { label: 'Product Range', value: '100+' },
            { label: 'Core Focus', value: 'R&D' },
          ].map(s => (
            <div key={s.label}>
              <div className="text-3xl font-bold text-accent">{s.value}</div>
              <div className="text-sm text-[var(--text-muted)] mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Focus Areas ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Mahyco&apos;s focus in agriculture</h2>
            <p className="mt-3 text-[var(--text-muted)]">Built on seed science, biotechnology, and farmer-first outcomes</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: FlaskConical,
                title: 'Biotechnology & Genomics',
                desc: 'Molecular breeding, genomics, and trait research to improve yield potential and crop resilience.',
                gradient: 'from-green-500/20 to-emerald-500/10',
              },
              {
                icon: Shield,
                title: 'Stress & Pest Resilience',
                desc: 'Research initiatives focused on insect resistance, stress tolerance, and stable field performance.',
                gradient: 'from-blue-500/20 to-cyan-500/10',
              },
              {
                icon: Sprout,
                title: 'Field + Vegetable Crops',
                desc: 'A broad portfolio serving major crop categories with hybrid and open-pollinated seed options.',
                gradient: 'from-purple-500/20 to-violet-500/10',
              },
              {
                icon: Wheat,
                title: 'Seed Innovation Legacy',
                desc: 'Long-standing contribution to India&apos;s seed ecosystem, with continuous breeding innovation.',
                gradient: 'from-yellow-500/20 to-orange-500/10',
              },
              {
                icon: Globe,
                title: 'Expanding Global Presence',
                desc: 'Mahyco&apos;s experience extends beyond India through collaborations and international operations.',
                gradient: 'from-teal-500/20 to-green-500/10',
              },
              {
                icon: Users,
                title: 'Farmer-Centric Impact',
                desc: 'Focused on helping farmers improve productivity, consistency, and profitability in the field.',
                gradient: 'from-pink-500/20 to-rose-500/10',
              },
            ].map(f => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="relative group p-6 rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] hover:border-accent/40 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <div className="relative">
                    <div className="h-11 w-11 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                      <Icon size={22} className="text-accent" />
                    </div>
                    <h3 className="font-semibold text-[var(--text-primary)] mb-2">{f.title}</h3>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Milestones ── */}
      <section className="py-24 px-6 bg-[var(--surface)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Mahyco journey highlights</h2>
            <p className="mt-3 text-[var(--text-muted)]">Key milestones that shaped the company&apos;s growth</p>
          </div>

          <div className="space-y-6">
            {[
              { step: '1964', title: 'Company founded', desc: 'Mahyco was founded by Dr. B. R. Barwale, with a strong emphasis on seed innovation and farmer needs.' },
              { step: 'R&D', title: 'Research-driven growth', desc: 'The company built deep capabilities in breeding, testing, production, and delivery of quality seeds.' },
              { step: 'Today', title: 'Broad crop portfolio', desc: 'Mahyco continues to serve field and vegetable crop segments with science-backed seed solutions.' },
            ].map((s) => (
              <div key={s.step} className="flex gap-6 items-start p-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg)] hover:border-accent/30 transition-colors">
                <div className="h-12 w-12 shrink-0 rounded-xl flex items-center justify-center text-lg font-bold text-accent" style={{ background: 'linear-gradient(135deg, rgba(22,163,74,0.15), rgba(21,128,61,0.05))' }}>
                  {s.step}
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)] mb-1">{s.title}</h3>
                  <p className="text-sm text-[var(--text-muted)] leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform CTA ── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-10 rounded-3xl border border-accent/20 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(22,163,74,0.1), rgba(21,128,61,0.05))' }}>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full blur-3xl opacity-20" style={{ background: 'radial-gradient(circle, #16a34a, transparent)' }} />
            </div>
            <div className="relative">
              <div className="h-14 w-14 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                <Leaf size={28} className="text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-3">Ready to analyze your field images?</h2>
              <p className="text-[var(--text-muted)] mb-8">
                Use the Mahyco analysis workspace to upload orthomosaic imagery, run model inference, and review health insights.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 h-12 px-8 text-sm font-semibold text-white rounded-xl transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 4px 20px rgba(22, 163, 74, 0.4)' }}
              >
                Get Started Free
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--border-default)] py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
              <Leaf size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold">Mahyco</span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            © {new Date().getFullYear()} Mahyco. Empowering agriculture with AI.
          </p>
        </div>
      </footer>
    </div>
  );
}
