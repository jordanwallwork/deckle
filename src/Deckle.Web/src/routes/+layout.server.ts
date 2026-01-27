import { authApi } from '$lib/api';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ fetch, url }) => {
  try {
    const user = await authApi.me(fetch);

    // If user is logged in but doesn't have a username, redirect to setup
    // (unless they're already on the setup page or the landing page)
    const isSetupPage = url.pathname === '/account/setup';
    const isLandingPage = url.pathname === '/';

    if (user && !user.username && !isSetupPage && !isLandingPage) {
      throw redirect(302, '/account/setup');
    }

    return {
      user,
      posthogKey: env.PUBLIC_POSTHOG_KEY
    };
  } catch (error) {
    // Re-throw redirects
    if ((error as any)?.status === 302) {
      throw error;
    }
    return {
      user: null,
      posthogKey: env.PUBLIC_POSTHOG_KEY
    };
  }
};
