import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError, api } from './client';

describe('ApiError', () => {
  it('is an instance of Error', () => {
    expect(new ApiError(404, 'Not found')).toBeInstanceOf(Error);
  });

  it('has the name "ApiError"', () => {
    expect(new ApiError(404, 'Not found').name).toBe('ApiError');
  });

  it('stores the HTTP status code', () => {
    expect(new ApiError(422, 'Unprocessable entity').status).toBe(422);
  });

  it('stores the error message', () => {
    expect(new ApiError(403, 'Forbidden').message).toBe('Forbidden');
  });

  it('stores optional response data', () => {
    const responseData = { errors: { name: ['Required'] } };
    expect(new ApiError(400, 'Validation failed', responseData).response).toBe(responseData);
  });

  it('has undefined response when not provided', () => {
    expect(new ApiError(500, 'Server error').response).toBeUndefined();
  });
});

describe('ApiClient.request', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  const okResponse = (body: unknown, status = 200) => ({
    ok: true,
    status,
    headers: { get: () => null },
    json: async () => body
  });

  const errorResponse = (status: number, body: unknown) => ({
    ok: false,
    status,
    statusText: 'Error',
    headers: { get: () => null },
    json: async () => body
  });

  it('always includes credentials in the request', async () => {
    mockFetch.mockResolvedValue(okResponse({ id: 1 }));
    await api.get('/test', undefined, mockFetch);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('always sets Content-Type to application/json', async () => {
    mockFetch.mockResolvedValue(okResponse({}));
    await api.post('/test', { name: 'x' }, undefined, mockFetch);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' })
      })
    );
  });

  it('serializes the body as JSON for POST', async () => {
    mockFetch.mockResolvedValue(okResponse({ id: 1 }, 201));
    await api.post('/projects', { name: 'My Project' }, undefined, mockFetch);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'My Project' }) })
    );
  });

  it('serializes the body as JSON for PUT', async () => {
    mockFetch.mockResolvedValue(okResponse({}));
    await api.put('/projects/1', { name: 'Updated' }, undefined, mockFetch);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ name: 'Updated' }) })
    );
  });

  it('sends no body for GET', async () => {
    mockFetch.mockResolvedValue(okResponse({ data: [] }));
    await api.get('/projects', undefined, mockFetch);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'GET' })
    );
    const [, options] = mockFetch.mock.calls[0];
    expect(options.body).toBeUndefined();
  });

  it('returns undefined for a 204 No Content response', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204, headers: { get: () => null }, json: async () => ({}) });
    const result = await api.delete('/projects/1', undefined, mockFetch);
    expect(result).toBeUndefined();
  });

  it('returns undefined when content-length is "0"', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: (h: string) => (h === 'content-length' ? '0' : null) },
      json: async () => ({})
    });
    const result = await api.get('/test', undefined, mockFetch);
    expect(result).toBeUndefined();
  });

  it('throws ApiError for non-ok responses', async () => {
    mockFetch.mockResolvedValue(errorResponse(404, { error: 'Resource not found' }));
    let thrown: unknown;
    try {
      await api.get('/missing', undefined, mockFetch);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(ApiError);
    expect((thrown as ApiError).status).toBe(404);
    expect((thrown as ApiError).message).toBe('Resource not found');
  });

  it('uses the "message" field from JSON when "error" is absent', async () => {
    mockFetch.mockResolvedValue(errorResponse(500, { message: 'Internal error' }));
    await expect(api.get('/test', undefined, mockFetch)).rejects.toMatchObject({
      message: 'Internal error'
    });
  });

  it('falls back to "HTTP status: statusText" when the response body has no error/message', async () => {
    mockFetch.mockResolvedValue(errorResponse(503, {}));
    await expect(api.get('/test', undefined, mockFetch)).rejects.toMatchObject({
      status: 503
    });
  });

  it('attaches the parsed JSON body to the thrown ApiError', async () => {
    const body = { errors: { Name: ['Required'] } };
    mockFetch.mockResolvedValue(errorResponse(400, body));
    let thrown: unknown;
    try {
      await api.post('/test', {}, undefined, mockFetch);
    } catch (err) {
      thrown = err;
    }
    expect((thrown as ApiError).response).toEqual(body);
  });
});
