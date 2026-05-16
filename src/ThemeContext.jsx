import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'taskflow.theme';

export const THEMES = [
  {
    id: 'midnight',
    label: 'Midnight',
    description: 'Default deep-purple dark mode',
    swatch: ['#0a0a0f', '#7c6cff', '#3b82f6'],
    kind: 'dark',
  },
  {
    id: 'aurora',
    label: 'Aurora',
    description: 'Vibrant pink & violet',
    swatch: ['#0c0817', '#ec4899', '#a855f7'],
    kind: 'dark',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    description: 'Teal & cyan calm',
    swatch: ['#06141c', '#14b8a6', '#0ea5e9'],
    kind: 'dark',
  },
  {
    id: 'daylight',
    label: 'Daylight',
    description: 'Clean light theme',
    swatch: ['#f7f7fb', '#6366f1', '#0ea5e9'],
    kind: 'light',
  },
];

const ThemeContext = createContext({ theme: 'midnight', setTheme: () => {} });

function getInitialTheme() {
  if (typeof window === 'undefined') return 'midnight';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && THEMES.some((t) => t.id === saved)) return saved;
  } catch {
    /* ignore */
  }
  return 'midnight';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const t = THEMES.find((x) => x.id === theme);
      if (t) meta.setAttribute('content', t.swatch[0]);
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const value = useMemo(
    () => ({ theme, setTheme: setThemeState, themes: THEMES }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
