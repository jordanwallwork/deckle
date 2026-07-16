import { describe, it, expect, vi } from 'vitest';
import { gameSetupsApi } from './gameSetups';

describe('gameSetupsApi.list', () => {
  const okResponse = (body: unknown) => ({
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => body
  });

  it('requests the project setups endpoint with a GET', async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse([]));
    await gameSetupsApi.list('project-123', mockFetch as typeof fetch);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/projects/project-123/setups');
    expect(options).toMatchObject({ method: 'GET' });
    expect(options.body).toBeUndefined();
  });

  it('returns the setup summaries from the response', async () => {
    const summaries = [
      {
        id: 's1',
        projectId: 'project-123',
        name: 'Two player',
        isValid: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-02T00:00:00Z'
      }
    ];
    const mockFetch = vi.fn().mockResolvedValue(okResponse(summaries));

    const result = await gameSetupsApi.list('project-123', mockFetch as typeof fetch);
    expect(result).toEqual(summaries);
  });
});

describe('gameSetupsApi.get', () => {
  const okResponse = (body: unknown) => ({
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => body
  });

  it('requests the single-setup endpoint with a GET', async () => {
    const mockFetch = vi.fn().mockResolvedValue(okResponse({}));
    await gameSetupsApi.get('project-123', 'setup-9', mockFetch as typeof fetch);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/projects/project-123/setups/setup-9');
    expect(options).toMatchObject({ method: 'GET' });
    expect(options.body).toBeUndefined();
  });

  it('returns the full setup detail including the document', async () => {
    const detail = {
      id: 'setup-9',
      projectId: 'project-123',
      name: 'Duel',
      isValid: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      document: { version: 1, minPlayers: 2, maxPlayers: 2 }
    };
    const mockFetch = vi.fn().mockResolvedValue(okResponse(detail));

    const result = await gameSetupsApi.get('project-123', 'setup-9', mockFetch as typeof fetch);
    expect(result).toEqual(detail);
  });
});
