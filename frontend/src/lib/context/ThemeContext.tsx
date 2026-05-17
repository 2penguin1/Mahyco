
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'dark' | 'dark-classic' | 'light' | 'dual-tone';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  isDark: true,
  setTheme: () => {},
  toggleTheme: () => {},
});

function applyThemeClass(theme: Theme) {
  const el = document.documentElement;
  el.classList.remove('dark', 'dark-classic', 'light', 'dual-tone');
  if (theme === 'dark-classic') {
    el.classList.add('dark', 'dark-classic');
  } else {
    el.classList.add(theme);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored && ['dark', 'dark-classic', 'light', 'dual-tone'].includes(stored)) {
      setThemeState(stored);
      applyThemeClass(stored);
    } else {
      applyThemeClass('dark');
    }
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    localStorage.setItem('theme', next);
    applyThemeClass(next);
  };

  const toggleTheme = () => {
    const order: Theme[] = ['dark', 'dark-classic', 'light', 'dual-tone'];
    const idx = order.indexOf(theme);
    const next = order[(idx + 1) % order.length];
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme !== 'light' && theme !== 'dual-tone', setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
