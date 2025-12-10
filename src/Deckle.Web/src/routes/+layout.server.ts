import { authApi } from '$lib/api';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ fetch }) => {
  try {
    const user = await authApi.me(fetch);
    return { user };
  } catch (error) {
    return { user: null };
  }
};
