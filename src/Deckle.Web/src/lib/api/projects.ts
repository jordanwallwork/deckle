import { api } from './client';
import type { Project, CreateProjectDto, UpdateProjectDto, ProjectUser } from '$lib/types';

/**
 * Projects API
 */
export const projectsApi = {
  /**
   * Get all projects for the current user
   */
  list: (fetchFn?: typeof fetch) => api.get<Project[]>('/projects', undefined, fetchFn),

  /**
   * Get a single project by ID
   */
  getById: (id: string, fetchFn?: typeof fetch) =>
    api.get<Project>(`/projects/${id}`, undefined, fetchFn),

  /**
   * Get a single project by owner username and project code
   */
  getByUsernameAndCode: (username: string, code: string, fetchFn?: typeof fetch) =>
    api.get<Project>(`/projects/${username}/${code}`, undefined, fetchFn),

  /**
   * Create a new project
   */
  create: (data: CreateProjectDto, fetchFn?: typeof fetch) =>
    api.post<Project>('/projects', data, undefined, fetchFn),

  /**
   * Update a project
   */
  update: (id: string, data: UpdateProjectDto, fetchFn?: typeof fetch) =>
    api.put<Project>(`/projects/${id}`, data, undefined, fetchFn),

  /**
   * Get all users for a project
   */
  getUsers: (id: string, fetchFn?: typeof fetch) =>
    api.get<ProjectUser[]>(`/projects/${id}/users`, undefined, fetchFn),

  /**
   * Invite a user to a project
   */
  inviteUser: (id: string, data: { email: string; role: string }, fetchFn?: typeof fetch) =>
    api.post<ProjectUser>(`/projects/${id}/users/invite`, data, undefined, fetchFn),

  /**
   * Remove a user from a project
   */
  removeUser: (projectId: string, userId: string, fetchFn?: typeof fetch) =>
    api.delete(`/projects/${projectId}/users/${userId}`, undefined, fetchFn),

  /**
   * Delete a project
   */
  delete: (id: string, fetchFn?: typeof fetch) => api.delete(`/projects/${id}`, undefined, fetchFn)
};
