import { readable } from 'svelte/store';

/**
 * Test mock for `$app/stores` (SvelteKit's runtime module, unavailable under the
 * bare vitest Svelte plugin). Provides just enough for editor components that
 * read `page.url`.
 */
const pageValue = {
  url: new URL('http://localhost/'),
  params: {},
  route: { id: null },
  status: 200,
  error: null,
  data: {},
  form: null,
  state: {}
};

export const page = readable(pageValue);
export const navigating = readable(null);
export const updated = { subscribe: readable(false).subscribe, check: async () => false };
