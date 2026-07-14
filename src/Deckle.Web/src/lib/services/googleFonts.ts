/**
 * Google Fonts service for fetching and managing fonts
 */
import { env } from '$env/dynamic/public';

export interface GoogleFont {
  family: string;
  variants: string[];
  category: string;
  subsets?: string[];
  version?: string;
  files?: Record<string, string>;
}

export interface GoogleFontsResponse {
  kind: string;
  items: GoogleFont[];
}

export type FontCategory = 'all' | 'serif' | 'sans-serif' | 'display' | 'handwriting' | 'monospace';

/**
 * Curated list of popular Google Fonts for quick selection
 */
export const POPULAR_FONTS: GoogleFont[] = [
  {
    family: 'Roboto',
    variants: ['100', '300', '400', '500', '700', '900', '100italic', '300italic', '400italic', '500italic', '700italic', '900italic'],
    category: 'sans-serif'
  },
  {
    family: 'Open Sans',
    variants: ['300', '400', '500', '600', '700', '800', '300italic', '400italic', '500italic', '600italic', '700italic', '800italic'],
    category: 'sans-serif'
  },
  {
    family: 'Lato',
    variants: ['100', '300', '400', '700', '900', '100italic', '300italic', '400italic', '700italic', '900italic'],
    category: 'sans-serif'
  },
  {
    family: 'Montserrat',
    variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900', '100italic', '200italic', '300italic', '400italic', '500italic', '600italic', '700italic', '800italic', '900italic'],
    category: 'sans-serif'
  },
  {
    family: 'Poppins',
    variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900', '100italic', '200italic', '300italic', '400italic', '500italic', '600italic', '700italic', '800italic', '900italic'],
    category: 'sans-serif'
  },
  {
    family: 'Inter',
    variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
    category: 'sans-serif'
  },
  {
    family: 'Playfair Display',
    variants: ['400', '500', '600', '700', '800', '900', '400italic', '500italic', '600italic', '700italic', '800italic', '900italic'],
    category: 'serif'
  },
  {
    family: 'Merriweather',
    variants: ['300', '400', '700', '900', '300italic', '400italic', '700italic', '900italic'],
    category: 'serif'
  },
  {
    family: 'Lora',
    variants: ['400', '500', '600', '700', '400italic', '500italic', '600italic', '700italic'],
    category: 'serif'
  },
  {
    family: 'PT Serif',
    variants: ['400', '700', '400italic', '700italic'],
    category: 'serif'
  },
  {
    family: 'Oswald',
    variants: ['200', '300', '400', '500', '600', '700'],
    category: 'sans-serif'
  },
  {
    family: 'Raleway',
    variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900', '100italic', '200italic', '300italic', '400italic', '500italic', '600italic', '700italic', '800italic', '900italic'],
    category: 'sans-serif'
  },
  {
    family: 'Bebas Neue',
    variants: ['400'],
    category: 'display'
  },
  {
    family: 'Pacifico',
    variants: ['400'],
    category: 'handwriting'
  },
  {
    family: 'Permanent Marker',
    variants: ['400'],
    category: 'handwriting'
  },
  {
    family: 'Fira Code',
    variants: ['300', '400', '500', '600', '700'],
    category: 'monospace'
  },
  {
    family: 'Source Code Pro',
    variants: ['200', '300', '400', '500', '600', '700', '800', '900', '200italic', '300italic', '400italic', '500italic', '600italic', '700italic', '800italic', '900italic'],
    category: 'monospace'
  }
];

/**
 * Default font (system font stack)
 */
export const SYSTEM_FONT = {
  family: 'System Default',
  variants: ['400'],
  category: 'sans-serif'
};

// Cache for Google Fonts API results
let fontsCache: GoogleFont[] | null = null;
let fontsCacheTimestamp: number | null = null;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Check if Google Fonts API is configured (has API key)
 */
export function isGoogleFontsApiConfigured(): boolean {
  return !!env.PUBLIC_GOOGLE_FONTS_API_KEY;
}

/**
 * Fetch all Google Fonts from the API
 * Requires PUBLIC_GOOGLE_FONTS_API_KEY environment variable
 */
export async function fetchGoogleFonts(): Promise<GoogleFont[]> {
  // Check cache first
  if (fontsCache && fontsCacheTimestamp && Date.now() - fontsCacheTimestamp < CACHE_DURATION) {
    return fontsCache;
  }

  const apiKey = env.PUBLIC_GOOGLE_FONTS_API_KEY;

  // If no API key, fall back to popular fonts
  if (!apiKey) {
    console.warn('Google Fonts API key not configured. Using popular fonts only.');
    return POPULAR_FONTS;
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=popularity`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch Google Fonts: ${response.statusText}`);
    }

    const data: GoogleFontsResponse = await response.json();
    fontsCache = data.items;
    fontsCacheTimestamp = Date.now();

    return data.items;
  } catch (error) {
    console.error('Error fetching Google Fonts:', error);
    // Fall back to popular fonts if API fails
    return POPULAR_FONTS;
  }
}

/**
 * Search Google Fonts by name and category
 */
export async function searchGoogleFonts(
  query: string,
  category: FontCategory = 'all',
  limit: number = 50
): Promise<GoogleFont[]> {
  const allFonts = await fetchGoogleFonts();

  let filtered = allFonts;

  // Filter by category
  if (category !== 'all') {
    filtered = filtered.filter(font => font.category === category);
  }

  // Filter by search query
  if (query.trim()) {
    const lowerQuery = query.toLowerCase();
    filtered = filtered.filter(font =>
      font.family.toLowerCase().includes(lowerQuery)
    );
  }

  // Return limited results
  return filtered.slice(0, limit);
}

/**
 * Get a specific font by family name
 */
export async function getFontByFamily(family: string): Promise<GoogleFont | undefined> {
  // Check popular fonts first (faster)
  const popularFont = POPULAR_FONTS.find(f => f.family === family);
  if (popularFont) {
    return popularFont;
  }

  // Search in all fonts
  const allFonts = await fetchGoogleFonts();
  return allFonts.find(f => f.family === family);
}

/**
 * Generate Google Fonts CSS URL for loading fonts
 * @param fonts Array of font families (variants are ignored for simplicity)
 * @returns Google Fonts CSS URL
 */
export function generateGoogleFontsCSSUrl(fonts: Array<{ family: string; variants?: string[] }>): string {
  if (fonts.length === 0) return '';

  // Simple format: just load font families with default weight
  // This avoids 400 Bad Request errors from malformed variant specifications
  const families = fonts.map(font => {
    const family = font.family.replaceAll(' ', '+');
    return `family=${family}`;
  }).join('&');

  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

/**
 * Load Google Fonts dynamically by injecting CSS link into document
 */
export function loadGoogleFonts(fonts: Array<{ family: string; variants?: string[] }>): void {
  if (typeof document === 'undefined') return; // Skip on server-side

  const url = generateGoogleFontsCSSUrl(fonts);
  if (!url) return;

  // Check if this font link already exists
  const existingLink = document.querySelector(`link[href="${url}"]`);
  if (existingLink) return;

  // Create and inject link element
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}
