export interface CalculationRecord {
  id: number
  expression: string
  result: number
  created_at: string
}

export interface CalculateResponse {
  success: boolean
  expression: string
  result: number
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
