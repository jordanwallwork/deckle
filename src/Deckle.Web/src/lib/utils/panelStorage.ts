import type { PanelLayout } from '$lib/types/panelLayout';
import { DEFAULT_PANEL_LAYOUT } from '$lib/types/panelLayout';
import { browser } from '$app/environment';

const STORAGE_KEY = 'deckle-panel-layout';

export function savePanelLayout(layout: PanelLayout): void {
  if (!browser) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch (error) {
    console.error('Failed to save panel layout:', error);
  }
}

export function loadPanelLayout(): PanelLayout {
  if (!browser) return DEFAULT_PANEL_LAYOUT;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all required properties exist
      return {
        ...DEFAULT_PANEL_LAYOUT,
        ...parsed,
        panels: {
          ...DEFAULT_PANEL_LAYOUT.panels,
          ...parsed.panels
        },
        splitSizes: {
          ...DEFAULT_PANEL_LAYOUT.splitSizes,
          ...parsed.splitSizes
        }
      };
    }
  } catch (error) {
    console.error('Failed to load panel layout:', error);
  }

  return DEFAULT_PANEL_LAYOUT;
}

export function resetPanelLayout(): void {
  if (!browser) return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to reset panel layout:', error);
  }
}
