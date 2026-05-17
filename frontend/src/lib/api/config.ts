import { appConfig } from '../runtime-config';

export const API_URL = appConfig.API_URL;
export const REQUEST_TIMEOUT = 30000;

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  error?: { message: string; code: string };
}

export function successResponse<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function errorResponse(message: string, code = 'ERROR'): ApiResponse<never> {
  return { success: false, data: null as never, error: { message, code } };
}

let authTokenGetter: (() => Promise<string>) | null = null;

export function setAuthTokenGetter(fn: (() => Promise<string>) | null): void {
  authTokenGetter = fn;
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!authTokenGetter) return {};
  try {
    const token = await authTokenGetter();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const auth = await getAuthHeaders();
  const headers = new Headers(options.headers);
  Object.entries(auth).forEach(([k, v]) => headers.set(k, v));
  return fetch(url, { ...options, headers });
}
