import { Platform } from 'react-native'
import { readToken } from './storage'

// Same REST API as the website. Native requests carry no browser Origin, so the
// server's CORS list needs no entry for the app.
const DEV_API = Platform.OS === 'android' ? 'http://10.0.2.2:4000/api' : 'http://localhost:4000/api'
export const API_URL = process.env.EXPO_PUBLIC_API_URL || DEV_API
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || 'http://localhost:5173'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message)
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  auth?: boolean
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (opts.auth) {
    const token = await readToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Network error')
  }
  if (res.status === 204) return undefined as T
  const data = (await res.json().catch(() => ({}))) as { message?: string; code?: string }
  if (!res.ok) throw new ApiError(res.status, data.message ?? `Request failed (${res.status})`, data.code)
  return data as T
}

/** Product photos may be site-relative (/products/…, served by the website). */
export function imageUri(url: string | null | undefined): string | null {
  if (!url) return null
  return url.startsWith('/') ? `${WEB_URL}${url}` : url
}
