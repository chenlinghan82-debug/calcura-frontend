import type { CalculateResponse, HistoryResponse, StatsResponse } from '../types/api'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = payload?.detail?.message ?? payload?.message ?? 'Request failed. Check that the backend is running.'
    throw new Error(message)
  }
  return payload as T
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

export function getStats() {
  return request<StatsResponse>('/api/stats')
}

export async function checkHealth() {
  const response = await fetch(`${API_BASE_URL}/api/health`)
  return response.ok
}

