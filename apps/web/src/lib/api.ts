import { getToken } from './auth'

const BASE_URL = import.meta.env.VITE_API_URL ?? ''

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function handleResponse(r: Response) {
  if (r.status === 204) return null
  const raw = await r.text()
  let data: any
  try {
    data = raw ? JSON.parse(raw) : {}
  } catch {
    if (!r.ok) throw new Error(raw?.trim() || r.statusText || `Error ${r.status}`)
    throw new Error(`Respuesta inesperada del servidor: ${raw.slice(0, 200)}`)
  }
  if (!r.ok) throw new Error(data.error ?? r.statusText)
  return data
}

export const api = {
  get: (path: string) =>
    fetch(`${BASE_URL}${path}`, { headers: { 'Content-Type': 'application/json', ...authHeaders() } }).then(handleResponse),

  post: (path: string, body?: unknown) =>
    fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body ?? {}),
    }).then(handleResponse),

  put: (path: string, body: unknown) =>
    fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    }).then(handleResponse),

  patch: (path: string, body?: unknown) =>
    fetch(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body ?? {}),
    }).then(handleResponse),

  delete: (path: string) =>
    fetch(`${BASE_URL}${path}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json', ...authHeaders() } }).then(handleResponse),
}
