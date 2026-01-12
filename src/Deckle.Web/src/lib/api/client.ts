import { config } from '$lib/config';

// Custom API error class
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Core API client class
class ApiClient {
  constructor(private baseUrl: string) {}

  /**
   * Make a request to the API
   * @param endpoint API endpoint path
   * @param options Fetch options
   * @param fetchFn Optional fetch function (for server-side use with SvelteKit's enhanced fetch)
   */
  async request<T>(endpoint: string, options?: RequestInit, fetchFn?: typeof fetch): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const fetchFunc = fetchFn || fetch;

    const response = await fetchFunc(url, {
      credentials: 'include', // Always include credentials for cookie-based auth
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorData: any;

      try {
        errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // If response is not JSON, try to get text
        try {
          errorMessage = (await response.text()) || errorMessage;
        } catch {
          // Use default error message
        }
      }

      throw new ApiError(response.status, errorMessage, errorData);
    }

    // Handle empty responses (204 No Content, etc.)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as T;
    }

    return response.json();
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestInit, fetchFn?: typeof fetch): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        ...options,
        method: 'GET'
      },
      fetchFn
    );
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit,
    fetchFn?: typeof fetch
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        ...options,
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined
      },
      fetchFn
    );
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit,
    fetchFn?: typeof fetch
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        ...options,
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined
      },
      fetchFn
    );
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestInit, fetchFn?: typeof fetch): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        ...options,
        method: 'DELETE'
      },
      fetchFn
    );
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit,
    fetchFn?: typeof fetch
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        ...options,
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined
      },
      fetchFn
    );
  }
}

// Export singleton instance
export const api = new ApiClient(config.apiUrl);
