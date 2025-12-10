import { api } from './client';
import type { Project, CreateProjectDto } from '$lib/types';

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
  getById: (id: string, fetchFn?: typeof fetch) => api.get<Project>(`/projects/${id}`, undefined, fetchFn),

  /**
   * Create a new project
   */
  create: (data: CreateProjectDto, fetchFn?: typeof fetch) => api.post<Project>('/projects', data, undefined, fetchFn),
};
