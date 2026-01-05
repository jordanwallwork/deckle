import { api } from './client';
import type { GameComponent, CreateCardDto, CreateDiceDto, UpdateCardDto, UpdateDiceDto, CreatePlayerMatDto, UpdatePlayerMatDto } from '$lib/types';

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

  /**
   * Save design for a component (Card or PlayerMat) for a specific part (front/back)
   */
  saveDesign: (projectId: string, componentId: string, part: string, design: string | null, fetchFn?: typeof fetch) =>
    api.put<GameComponent>(`/projects/${projectId}/components/${componentId}/design/${part}`, { design }, undefined, fetchFn),

  /**
   * Update data source for a component (Card or PlayerMat)
   */
  updateDataSource: (projectId: string, componentId: string, dataSourceId: string | null, fetchFn?: typeof fetch) =>
    api.put<GameComponent>(`/projects/${projectId}/components/${componentId}/datasource`, { dataSourceId }, undefined, fetchFn),

  /**
   * Create a new player mat component
   */
  createPlayerMat: (projectId: string, data: CreatePlayerMatDto, fetchFn?: typeof fetch) =>
    api.post<GameComponent>(`/projects/${projectId}/components/playermats`, data, undefined, fetchFn),

  /**
   * Update a player mat component
   */
  updatePlayerMat: (projectId: string, componentId: string, data: UpdatePlayerMatDto, fetchFn?: typeof fetch) =>
    api.put<GameComponent>(`/projects/${projectId}/components/playermats/${componentId}`, data, undefined, fetchFn),
};
