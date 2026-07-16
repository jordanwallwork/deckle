import { api } from './client';
import type { GameSetupDetail, GameSetupSummary } from '$lib/types';

/**
 * Game Setups API
 *
 * Setups belong to a project and are served under `/projects/{projectId}/setups`.
 * The picker (#119) needs `list`; the Play flow (#120) additionally needs `get`
 * to pull the full setup document before validating and running it. The
 * remaining full-document CRUD calls are added by the setup editor work.
 */
export const gameSetupsApi = {
  /**
   * Get all game setup summaries for a project.
   */
  list: (projectId: string, fetchFn?: typeof fetch) =>
    api.get<GameSetupSummary[]>(`/projects/${projectId}/setups`, undefined, fetchFn),

  /**
   * Get a single game setup including its full DSL document.
   */
  get: (projectId: string, setupId: string, fetchFn?: typeof fetch) =>
    api.get<GameSetupDetail>(`/projects/${projectId}/setups/${setupId}`, undefined, fetchFn)
};
