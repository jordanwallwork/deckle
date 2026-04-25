import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ parent, url }) => {
  const { user } = await parent();

  if (!user) {
    const returnUrl = encodeURIComponent(url.pathname + url.search);
    throw redirect(302, `/?returnUrl=${returnUrl}`);
  }

  return { user };
};
