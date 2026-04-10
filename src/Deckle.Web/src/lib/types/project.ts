// Project entity types

export type ProjectVisibility = 'Private' | 'Teaser' | 'Public';

export interface Project {
  id: string;
  name: string;
  code: string;
  description?: string;
  visibility: ProjectVisibility;
  createdAt: string;
  updatedAt: string;
  role: string;
  ownerUsername: string;
}

export interface CreateProjectDto {
  name: string;
  code: string;
  description?: string;
  visibility?: ProjectVisibility;
}

export interface UpdateProjectDto {
  name: string;
  description?: string;
  visibility?: ProjectVisibility;
}

export interface ProjectStorage {
  totalBytes: number;
  componentBytes: number;
  dataSourceBytes: number;
  fileBytes: number;
}

export interface ProjectUser {
  userId: string;
  email: string;
  name?: string;
  pictureUrl?: string;
  role: 'Owner' | 'Collaborator';
  joinedAt: string;
  isPending: boolean;
}
