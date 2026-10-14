import { invalidateAll } from '$app/navigation';
import { ApiError } from '$lib/api';

/**
 * Runs an admin API action then reloads page data. Resolves to an error message to show
 * inline (the API's `{ error }` message when available), or null on success.
 */
export async function runAdminAction(
  action: () => Promise<unknown>,
  fallbackError: string
): Promise<string | null> {
  try {
    await action();
    await invalidateAll();
    return null;
  } catch (err) {
    return err instanceof ApiError ? err.message : fallbackError;
  }
}
