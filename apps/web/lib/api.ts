const API_BASE =
  typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface ApiOk<T> { success: true; data: T; meta?: Record<string, unknown> }
export interface ApiErr { success: false; error: { code: string; message: string; details?: unknown } }
export type ApiResponse<T> = ApiOk<T> | ApiErr;

async function request<T>(path: string, opts: RequestInit = {}): Promise<ApiResponse<T>> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers ?? {}),
    },
    ...opts,
  });
  let body: ApiResponse<T>;
  try {
    body = await res.json();
  } catch {
    return {
      success: false,
      error: { code: 'PARSE_ERROR', message: `Bad JSON from ${path}` },
    };
  }
  return body;
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  del: <T,>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export const apiBase = API_BASE;
