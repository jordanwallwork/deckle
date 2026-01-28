import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { config } from '$lib/config';

export const load: LayoutServerLoad = async ({ parent, url }) => {
  const { user } = await parent();

  if (!user) {
    const returnUrl = encodeURIComponent(url.pathname + url.search);
    throw redirect(302, `${config.apiUrl}/auth/login?returnUrl=${returnUrl}`);
  }

  return { user };
};
