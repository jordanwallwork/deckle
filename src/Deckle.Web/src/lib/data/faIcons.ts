export type FaIconStyle = 'regular' | 'solid';

export interface FaIcon {
  name: string;
  style: FaIconStyle;
  keywords: string[];
}

interface FaMetadataEntry {
  free: string[];
  search: { terms: string[] };
  label: string;
}

const METADATA_URL =
  'https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/metadata/icons.json';
const CACHE_KEY = 'fa-icons-cache';

let cachedIcons: FaIcon[] | null = null;
let inflight: Promise<FaIcon[]> | null = null;

function loadFromSessionStorage(): FaIcon[] | null {
  try {
    const stored = sessionStorage.getItem(CACHE_KEY);
    if (stored) {
      return JSON.parse(stored) as FaIcon[];
    }
  } catch {
    // sessionStorage unavailable (SSR) or corrupt data
  }
  return null;
}

function saveToSessionStorage(icons: FaIcon[]): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(icons));
  } catch {
    // sessionStorage unavailable or quota exceeded
  }
}

function parseMetadata(data: Record<string, FaMetadataEntry>): FaIcon[] {
  const icons: FaIcon[] = [];
  for (const [name, entry] of Object.entries(data)) {
    if (!entry.free || entry.free.length === 0) continue;
    for (const freeStyle of entry.free.filter((s) => s === 'regular' || s == 'solid')) {
      console.log(name, entry, freeStyle);
      const style: FaIconStyle = freeStyle === 'regular' ? 'regular' : 'solid';
      icons.push({
        name,
        style,
        keywords: entry.search?.terms ?? []
      });
    }
  }
  icons.sort((a, b) => a.name.localeCompare(b.name));
  return icons;
}

/**
 * Fetches the full list of free Font Awesome 6 icons from GitHub metadata.
 * Results are cached in memory and sessionStorage to avoid re-fetching.
 */
export async function loadFaIcons(): Promise<FaIcon[]> {
  if (cachedIcons) return cachedIcons;

  const stored = loadFromSessionStorage();
  if (stored) {
    cachedIcons = stored;
    return stored;
  }

  // Deduplicate concurrent requests
  if (inflight !== null) return inflight;

  inflight = fetch(METADATA_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch icon metadata: ${res.status}`);
      return res.json();
    })
    .then((data: Record<string, FaMetadataEntry>) => {
      const icons = parseMetadata(data);
      cachedIcons = icons;
      saveToSessionStorage(icons);
      inflight = null;
      return icons;
    })
    .catch((err) => {
      inflight = null;
      throw err;
    });

  return inflight;
}

