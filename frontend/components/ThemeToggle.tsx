'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem('syncspace-theme', theme);
  window.dispatchEvent(new CustomEvent('syncspace-theme-change', { detail: theme }));
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const syncFromDocument = () => {
      const current = (document.documentElement.dataset.theme as Theme | undefined) || 'light';
      setTheme(current);
    };
    const syncFromEvent = (event: Event) => {
      const next = (event as CustomEvent<Theme>).detail;
      if (next === 'light' || next === 'dark') setTheme(next);
    };

    syncFromDocument();
    window.addEventListener('syncspace-theme-change', syncFromEvent);
    return () => window.removeEventListener('syncspace-theme-change', syncFromEvent);
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  };

  const dark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle ${compact ? 'theme-toggle-compact' : ''}`}
      aria-label={dark ? 'Switch to day mode' : 'Switch to night mode'}
      title={dark ? 'Day mode' : 'Night mode'}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span className={`theme-toggle-thumb ${dark ? 'is-dark' : ''}`}>
          {dark ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M20.5 14.4A8.5 8.5 0 0 1 9.6 3.5 8.6 8.6 0 1 0 20.5 14.4Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
            </svg>
          )}
        </span>
      </span>
      {!compact && <span className="theme-toggle-label">{dark ? 'Night' : 'Day'}</span>}
    </button>
  );
}
