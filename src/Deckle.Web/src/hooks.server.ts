import type { Handle, HandleServerError } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { Exceptionless, toError } from '@exceptionless/node';

// Initialize Exceptionless for error tracking
const exceptionlessKey = privateEnv.EXCEPTIONLESS__KEY;
if (exceptionlessKey) {
  Exceptionless.startup((c) => {
    c.apiKey = exceptionlessKey;
    c.defaultTags.push('Deckle', 'svelte-kit', 'server');
  });
}

/**
 * SvelteKit server hooks
 * This hook intercepts all server-side requests and modifies the fetch function
 * to forward authentication cookies to the API domain during SSR.
 */
export const handle: Handle = async ({ event, resolve }) => {
  // Override the fetch function to forward cookies to API domain
  const originalFetch = event.fetch;

  event.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    // Check if this is a request to the API domain
    const apiUrl = env.PUBLIC_API_URL || 'http://localhost:5209';
    if (url.startsWith(apiUrl)) {
      // Get cookies from the incoming request
      const cookieHeader = event.request.headers.get('cookie');

      if (cookieHeader) {
        // Forward cookies to the API request
        const headers = new Headers(init?.headers);
        headers.set('cookie', cookieHeader);

        return originalFetch(input, {
          ...init,
          headers,
          credentials: 'include'
        });
      }
    }

    // For all other requests, use the original fetch
    return originalFetch(input, init);
  };

  return resolve(event);
};

/**
 * Handle server errors by logging them to Exceptionless
 */
export const handleError: HandleServerError = async ({ error, event }) => {
  if (exceptionlessKey) {
    await Exceptionless.submitException(toError(error));
  }

  console.error('Server error:', error);

  return {
    message: 'An unexpected error occurred'
  };
};
