export type ThemePref = 'light' | 'dark' | 'system';

function getSystemPref(): 'light' | 'dark' {
  if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(pref: ThemePref): 'light' | 'dark' {
  return pref === 'system' ? getSystemPref() : pref;
}

export function applyTheme(pref: ThemePref): void {
  if (typeof document === 'undefined') return;
  const effective = resolveTheme(pref);

  // Use class strategy on <html> to enable CSS overrides
  const root = document.documentElement;
  if (effective === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Also set a data attribute that can be queried if needed
  root.setAttribute('data-theme', effective);
}
