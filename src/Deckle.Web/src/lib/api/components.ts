import { api } from './client';
import type { GameComponent, CreateCardDto, CreateDiceDto } from '$lib/types';

/**
 * Components API
 */
export const componentsApi = {
  /**
   * Get all components for a project
   */
  listByProject: (projectId: string, fetchFn?: typeof fetch) =>
    api.get<GameComponent[]>(`/projects/${projectId}/components`, undefined, fetchFn),

  /**
   * Create a new card component
   */
  createCard: (projectId: string, data: CreateCardDto, fetchFn?: typeof fetch) =>
    api.post<GameComponent>(`/projects/${projectId}/components/cards`, data, undefined, fetchFn),

  /**
   * Create a new dice component
   */
  createDice: (projectId: string, data: CreateDiceDto, fetchFn?: typeof fetch) =>
    api.post<GameComponent>(`/projects/${projectId}/components/dice`, data, undefined, fetchFn),
};
