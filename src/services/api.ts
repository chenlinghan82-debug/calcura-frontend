import type { CalculateResponse, FavoriteResponse, HistoryResponse, PreviewResponse, StatsResponse } from '../types/api'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase()
  const headers = new Headers(init?.headers ?? {})
  // text/plain keeps the browser from making a CORS preflight. GET and DELETE
  // must not send a JSON content type, or every read also waits on OPTIONS.
  if (method === 'POST' && init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'text/plain;charset=UTF-8')
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = payload?.detail?.message ?? payload?.message ?? 'Request failed. Check that the backend is running.'
    throw new Error(message)
  }
  return payload as T
}

export function preview(expression: string) {
  return request<PreviewResponse>('/api/preview', {
    method: 'POST',
    body: JSON.stringify({ expression }),
  })
}

export function calculate(expression: string) {
  return request<CalculateResponse>('/api/calculate', {
    method: 'POST',
    body: JSON.stringify({ expression }),
  })
}

export function getHistory(keyword = '') {
  const query = keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''
  return request<HistoryResponse>(`/api/history${query}`)
}

export function deleteHistory(id: number) {
  return request<{ success: boolean; message: string }>(`/api/history/${id}`, { method: 'DELETE' })
}

export function clearHistory() {
  return request<{ success: boolean; deleted_count: number }>('/api/history', { method: 'DELETE' })
}

export function toggleFavorite(id: number) {
  return request<FavoriteResponse>(`/api/history/${id}/favorite`, { method: 'POST' })
}

export function getStats() {
  return request<StatsResponse>('/api/stats')
}

export async function downloadHistory() {
  const response = await fetch(`${API_BASE_URL}/api/history/export`)
  if (!response.ok) throw new Error('The history export could not be downloaded.')
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'calcura-history.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function checkHealth() {
  const response = await fetch(`${API_BASE_URL}/api/health`)
  return response.ok
}

export async function getHealth() {
  const response = await fetch(`${API_BASE_URL}/api/health`)
  if (!response.ok) throw new Error('The backend health check failed.')
  return response.json() as Promise<{ success: boolean; status: string; database?: string }>
}
