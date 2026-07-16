import { api } from './client';
import type { GameSetupSummary } from '$lib/types';

/**
 * Game Setups API
 *
 * Setups belong to a project and are served under `/projects/{projectId}/setups`.
 * Only `list` is needed by the setup picker (#119); the full-document CRUD calls
 * are added by the setup editor work.
 */
export const gameSetupsApi = {
  /**
   * Get all game setup summaries for a project.
   */
  list: (projectId: string, fetchFn?: typeof fetch) =>
    api.get<GameSetupSummary[]>(`/projects/${projectId}/setups`, undefined, fetchFn)
};
