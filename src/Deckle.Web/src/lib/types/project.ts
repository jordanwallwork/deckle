// Project entity types

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  role: string;
}

export interface CreateProjectDto {
  name: string;
  description?: string;
}

export interface UpdateProjectDto {
  name: string;
  description?: string;
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
