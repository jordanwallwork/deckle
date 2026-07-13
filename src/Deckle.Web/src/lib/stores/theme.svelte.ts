export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'deckle-theme';

function readInitialTheme(): Theme {
  // The inline script in app.html has already resolved and applied the theme to
  // <html data-theme>. Mirror it here so SSR and the first client render agree.
  if (typeof document !== 'undefined') {
    const applied = document.documentElement.dataset.theme;
    if (applied === 'light' || applied === 'dark') {
      return applied;
    }
  }
  return 'light';
}

let current = $state<Theme>(readInitialTheme());

function apply(theme: Theme): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage unavailable (private mode / disabled) — theme still applies for the session */
    }
  }
}

export const theme = {
  get current(): Theme {
    return current;
  },
  set(next: Theme): void {
    current = next;
    apply(next);
  },
  toggle(): void {
    this.set(current === 'dark' ? 'light' : 'dark');
  }
};
