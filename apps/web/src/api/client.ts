/**
 * Base API client for making requests to the backend.
 * All API modules use this client for consistent error handling and auth.
 */

const API_BASE = '/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public type?: string
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new ApiError(response.status, error.detail || error.title || 'Request failed', error.type);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
}

export const api = {
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    const response = await fetch(buildUrl(path, options?.params), {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    return handleResponse<T>(response);
  },

  async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const response = await fetch(buildUrl(path, options?.params), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const response = await fetch(buildUrl(path, options?.params), {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    const response = await fetch(buildUrl(path, options?.params), {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(response);
  },

  async delete<T = void>(path: string, options?: RequestOptions): Promise<T> {
    const response = await fetch(buildUrl(path, options?.params), {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    return handleResponse<T>(response);
  },
};
