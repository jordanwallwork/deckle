/**
 * Font loader store for managing Google Fonts loading
 */

import { writable } from 'svelte/store';
import { loadGoogleFonts, getFontByFamily } from '$lib/services/googleFonts';
import type { FontMetadata } from '$lib/components/editor/types';

interface FontLoaderState {
  loadedFonts: Set<string>; // Family names that have been loaded
  loadingFonts: Set<string>; // Family names currently being loaded
}

function createFontLoader() {
  const { subscribe, set, update } = writable<FontLoaderState>({
    loadedFonts: new Set(),
    loadingFonts: new Set()
  });

  /**
   * Load a single font
   */
  async function loadFont(family: string): Promise<void> {
    // Skip system default and already loaded/loading fonts
    if (
      family === 'System Default' ||
      family === '' ||
      !family
    ) {
      return;
    }

    // Check if already loaded or loading
    let isAlreadyHandled = false;
    update(state => {
      if (state.loadedFonts.has(family) || state.loadingFonts.has(family)) {
        isAlreadyHandled = true;
        return state;
      }

      // Mark as loading
      state.loadingFonts.add(family);
      return state;
    });

    if (isAlreadyHandled) {
      return;
    }

    try {
      // Get font metadata from Google Fonts
      const fontData = await getFontByFamily(family);

      if (fontData) {
        // Load the font using Google Fonts CSS
        loadGoogleFonts([{
          family: fontData.family,
          variants: fontData.variants
        }]);

        // Wait a bit to ensure font is loaded
        await new Promise(resolve => setTimeout(resolve, 100));

        // Mark as loaded
        update(state => {
          state.loadingFonts.delete(family);
          state.loadedFonts.add(family);
          return state;
        });
      } else {
        // Font not found, remove from loading
        update(state => {
          state.loadingFonts.delete(family);
          return state;
        });
      }
    } catch (error) {
      console.error(`Failed to load font: ${family}`, error);
      // Remove from loading on error
      update(state => {
        state.loadingFonts.delete(family);
        return state;
      });
    }
  }

  /**
   * Load multiple fonts
   */
  async function loadFonts(families: string[]): Promise<void> {
    await Promise.all(families.map(family => loadFont(family)));
  }

  /**
   * Load fonts from FontMetadata array
   */
  async function loadFontsFromMetadata(fonts: FontMetadata[]): Promise<void> {
    await loadFonts(fonts.map(f => f.family));
  }

  /**
   * Preload fonts for the template
   */
  async function preloadTemplateFonts(fonts: FontMetadata[]): Promise<void> {
    if (fonts && fonts.length > 0) {
      await loadFontsFromMetadata(fonts);
    }
  }

  /**
   * Reset the loader state
   */
  function reset() {
    set({
      loadedFonts: new Set(),
      loadingFonts: new Set()
    });
  }

  return {
    subscribe,
    loadFont,
    loadFonts,
    loadFontsFromMetadata,
    preloadTemplateFonts,
    reset
  };
}

export const fontLoader = createFontLoader();
