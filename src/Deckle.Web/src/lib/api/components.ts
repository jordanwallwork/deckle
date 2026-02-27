import { api } from './client';
import type {
  GameComponent,
  CreateCardDto,
  CreateDiceDto,
  UpdateCardDto,
  UpdateDiceDto,
  CreateGameBoardDto,
  UpdateGameBoardDto,
  CreatePlayerMatDto,
  UpdatePlayerMatDto
} from '$lib/types';

type OptionalProjectId = string | null | undefined;

function componentsBase(projectId: OptionalProjectId) {
  return `/projects/${projectId ?? 'sample'}/components`;
}

/**
 * Components API
 */
export const componentsApi = {
  /**
   * Get all components for a project
   */
  listByProject: (projectId: OptionalProjectId, fetchFn?: typeof fetch) =>
    api.get<GameComponent[]>(componentsBase(projectId), undefined, fetchFn),

  /**
   * Get a component by ID
   */
  getById: (projectId: OptionalProjectId, componentId: string, fetchFn?: typeof fetch) =>
    api.get<GameComponent>(`${componentsBase(projectId)}/${componentId}`, undefined, fetchFn),

  /**
   * Create a new card component
   */
  createCard: (projectId: OptionalProjectId, data: CreateCardDto, fetchFn?: typeof fetch) =>
    api.post<GameComponent>(`${componentsBase(projectId)}/cards`, data, undefined, fetchFn),

  /**
   * Create a new dice component
   */
  createDice: (projectId: OptionalProjectId, data: CreateDiceDto, fetchFn?: typeof fetch) =>
    api.post<GameComponent>(`${componentsBase(projectId)}/dice`, data, undefined, fetchFn),

  /**
   * Update a card component
   */
  updateCard: (
    projectId: OptionalProjectId,
    componentId: string,
    data: UpdateCardDto,
    fetchFn?: typeof fetch
  ) =>
    api.put<GameComponent>(
      `${componentsBase(projectId)}/cards/${componentId}`,
      data,
      undefined,
      fetchFn
    ),

  /**
   * Update a dice component
   */
  updateDice: (
    projectId: OptionalProjectId,
    componentId: string,
    data: UpdateDiceDto,
    fetchFn?: typeof fetch
  ) =>
    api.put<GameComponent>(
      `${componentsBase(projectId)}/dice/${componentId}`,
      data,
      undefined,
      fetchFn
    ),

  /**
   * Delete a component
   */
  delete: (projectId: OptionalProjectId, componentId: string, fetchFn?: typeof fetch) =>
    api.delete(`${componentsBase(projectId)}/${componentId}`, undefined, fetchFn),

  /**
   * Save design for a component (Card or PlayerMat) for a specific part (front/back)
   */
  saveDesign: (
    projectId: OptionalProjectId,
    componentId: string,
    part: string,
    design: string | null,
    fetchFn?: typeof fetch
  ) =>
    api.put<GameComponent>(
      `${componentsBase(projectId)}/${componentId}/design/${part}`,
      { design },
      undefined,
      fetchFn
    ),

  /**
   * Update data source for a component (Card or PlayerMat)
   */
  updateDataSource: (
    projectId: OptionalProjectId,
    componentId: string,
    dataSourceId: string | null,
    fetchFn?: typeof fetch
  ) =>
    api.put<GameComponent>(
      `${componentsBase(projectId)}/${componentId}/datasource`,
      { dataSourceId },
      undefined,
      fetchFn
    ),

  /**
   * Create a new game board component
   */
  createGameBoard: (
    projectId: OptionalProjectId,
    data: CreateGameBoardDto,
    fetchFn?: typeof fetch
  ) =>
    api.post<GameComponent>(`${componentsBase(projectId)}/gameboards`, data, undefined, fetchFn),

  /**
   * Update a game board component
   */
  updateGameBoard: (
    projectId: OptionalProjectId,
    componentId: string,
    data: UpdateGameBoardDto,
    fetchFn?: typeof fetch
  ) =>
    api.put<GameComponent>(
      `${componentsBase(projectId)}/gameboards/${componentId}`,
      data,
      undefined,
      fetchFn
    ),

  /**
   * Create a new player mat component
   */
  createPlayerMat: (
    projectId: OptionalProjectId,
    data: CreatePlayerMatDto,
    fetchFn?: typeof fetch
  ) => api.post<GameComponent>(`${componentsBase(projectId)}/playermats`, data, undefined, fetchFn),

  /**
   * Get sample components for a component type (card, playermat)
   */
  getSamples: (type: string, fetchFn?: typeof fetch) =>
    api.get<GameComponent[]>(`/samples?type=${type}`, undefined, fetchFn),

  /**
   * Update a player mat component
   */
  updatePlayerMat: (
    projectId: OptionalProjectId,
    componentId: string,
    data: UpdatePlayerMatDto,
    fetchFn?: typeof fetch
  ) =>
    api.put<GameComponent>(
      `${componentsBase(projectId)}/playermats/${componentId}`,
      data,
      undefined,
      fetchFn
    )
};
