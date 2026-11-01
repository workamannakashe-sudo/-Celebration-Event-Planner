/**
 * @file frontend/js/theme.js
 * @description Manages light and dark theme toggling, system preference detection,
 * and localStorage persistence.
 */

const THEME_STORAGE_KEY = 'utsav_theme';

/**
 * Determine the initial theme: saved user preference, or fallback to OS preference.
 * @returns {'light'|'dark'}
 */
export function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage might be disabled
  }
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

/**
 * Apply the theme to the document root and persist it.
 * @param {'light'|'dark'} theme
 */
export function applyTheme(theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Toggle between light and dark theme.
 * @returns {'light'|'dark'} The newly active theme
 */
export function toggleTheme() {
  const current = (typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme')) || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

/**
 * Initialize theme listener on startup.
 */
export function initTheme() {
  const theme = getInitialTheme();
  applyTheme(theme);

  // Listen to OS changes if no manual preference stored
  if (typeof window !== 'undefined' && window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      try {
        if (!localStorage.getItem(THEME_STORAGE_KEY)) {
          applyTheme(e.matches ? 'dark' : 'light');
        }
      } catch {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }
}
