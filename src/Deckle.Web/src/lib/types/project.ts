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
