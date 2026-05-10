import { api } from './client';

export interface ApiKey {
	id: string;
	name: string;
	createdAt: string;
	lastUsedAt: string | null;
}

export interface CreateApiKeyResponse {
	id: string;
	name: string;
	key: string;
	createdAt: string;
}

export const apiKeysApi = {
	list: (fetchFn?: typeof fetch) => api.get<ApiKey[]>('/api-keys', undefined, fetchFn),

	create: (name: string) =>
		api.post<CreateApiKeyResponse>('/api-keys', { name }),

	delete: (id: string) => api.delete<void>(`/api-keys/${id}`)
};
