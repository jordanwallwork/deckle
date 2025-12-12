import { api } from './client';
import type { GameComponent, CreateCardDto, CreateDiceDto, UpdateCardDto, UpdateDiceDto } from '$lib/types';

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
   * Get a component by ID
   */
  getById: (projectId: string, componentId: string, fetchFn?: typeof fetch) =>
    api.get<GameComponent>(`/projects/${projectId}/components/${componentId}`, undefined, fetchFn),

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

  /**
   * Update a card component
   */
  updateCard: (projectId: string, componentId: string, data: UpdateCardDto, fetchFn?: typeof fetch) =>
    api.put<GameComponent>(`/projects/${projectId}/components/cards/${componentId}`, data, undefined, fetchFn),

  /**
   * Update a dice component
   */
  updateDice: (projectId: string, componentId: string, data: UpdateDiceDto, fetchFn?: typeof fetch) =>
    api.put<GameComponent>(`/projects/${projectId}/components/dice/${componentId}`, data, undefined, fetchFn),

  /**
   * Delete a component
   */
  delete: (projectId: string, componentId: string, fetchFn?: typeof fetch) =>
    api.delete(`/projects/${projectId}/components/${componentId}`, undefined, fetchFn),
};
