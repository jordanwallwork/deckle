import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { user } = await parent();

  if (user) {
    if (user.role === 'Administrator') {
      throw redirect(302, '/admin');
    } else {
      throw redirect(302, '/projects');
    }
  }

  return {};
};
