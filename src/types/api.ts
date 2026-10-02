export interface CalculationRecord {
  id: number
  expression: string
  result: number
  is_favorite?: boolean
  steps?: string[]
  created_at: string
}

export interface CalculateResponse {
  success: boolean
  expression: string
  result: number
  steps: string[]
  record: CalculationRecord
}

export interface HistoryResponse {
  success: boolean
  items: CalculationRecord[]
  total: number
}

export interface StatsResponse {
  success: boolean
  total: number
  average: number | null
  minimum: number | null
  maximum: number | null
}

export interface FavoriteResponse {
  success: boolean
  record: CalculationRecord
}

export interface PreviewResponse {
  success: boolean
  expression: string
  result: number
  steps: string[]
  saved: boolean
}
