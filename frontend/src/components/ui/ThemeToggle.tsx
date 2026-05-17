
import { Moon, Sun, MoonStar, Contrast } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme, type Theme } from '@/lib/context/ThemeContext';

const THEME_ORDER: { value: Theme; icon: typeof Sun; key: string }[] = [
  { value: 'light',        icon: Sun,      key: 'light'       },
  { value: 'dark',         icon: Moon,     key: 'dark'        },
  { value: 'dark-classic', icon: MoonStar, key: 'darkClassic' },
  { value: 'dual-tone',    icon: Contrast, key: 'dualTone'    },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const currentIndex = THEME_ORDER.findIndex(o => o.value === theme);
  const current = THEME_ORDER[currentIndex === -1 ? 0 : currentIndex];
  const nextIndex = (currentIndex + 1) % THEME_ORDER.length;
  const next = THEME_ORDER[nextIndex];
  const Icon = current.icon;

  return (
    <button
      onClick={() => setTheme(next.value)}
      className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-colors"
      aria-label={t('ui.theme.ariaLabel')}
      title={t(`ui.theme.${next.key}`)}
    >
      <Icon size={16} />
    </button>
  );
}
