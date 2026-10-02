import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowDownLeft,
  Calculator,
  Check,
  Clipboard,
  Clock3,
  Command,
  History,
  Moon,
  Search,
  Sparkles,
  Sun,
  Trash2,
  Wifi,
  X,
} from 'lucide-react'
import { calculate, checkHealth, clearHistory, deleteHistory, getHistory, getStats } from './services/api'
import type { CalculationRecord, StatsResponse } from './types/api'

const buttons = [
  { label: 'AC', value: 'clear', kind: 'utility' },
  { label: '⌫', value: 'backspace', kind: 'utility' },
  { label: '(', value: '(', kind: 'utility' },
  { label: ')', value: ')', kind: 'utility' },
  { label: '÷', value: '/', kind: 'operator' },
  { label: '7', value: '7', kind: 'number' },
  { label: '8', value: '8', kind: 'number' },
  { label: '9', value: '9', kind: 'number' },
  { label: '×', value: '*', kind: 'operator' },
  { label: '−', value: '-', kind: 'operator' },
  { label: '4', value: '4', kind: 'number' },
  { label: '5', value: '5', kind: 'number' },
  { label: '6', value: '6', kind: 'number' },
  { label: '+', value: '+', kind: 'operator' },
  { label: '1', value: '1', kind: 'number' },
  { label: '2', value: '2', kind: 'number' },
  { label: '3', value: '3', kind: 'number' },
  { label: '.', value: '.', kind: 'number' },
  { label: '0', value: '0', kind: 'number wide' },
  { label: '=', value: 'equals', kind: 'equals' },
] as const

type BackendStatus = 'checking' | 'online' | 'offline'

function friendlyError(message: string) {
  if (message.includes('Division by zero')) return 'Division by zero is not allowed.'
  if (message.includes('Invalid') || message.includes('Expected') || message.includes('Unexpected') || message.includes('Missing')) {
    return 'Invalid expression. Check the numbers, operators, and parentheses.'
  }
  if (message.includes('Unsupported')) return 'Unsupported character. Use numbers, parentheses, and + - × ÷.'
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) return 'The backend is unavailable. Start the API and try again.'
  return message || 'The calculation could not be completed.'
}

function formatResult(value: number) {
  if (!Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 10 }).format(value)
}

function formatTime(value: string) {
  const normalizedValue = value.includes('T') && !/[zZ]|[+-]\d{2}:\d{2}$/.test(value) ? `${value}Z` : value
  const date = new Date(normalizedValue)
  if (Number.isNaN(date.getTime())) return 'Unknown time'

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

function expressionForDisplay(value: string) {
  return value.replaceAll('*', ' × ').replaceAll('/', ' ÷ ').replaceAll('-', ' − ').replaceAll('+', ' + ')
}

const HISTORY_CACHE_KEY = 'calcura-history-cache-v1'

function readCachedHistory(): CalculationRecord[] {
  try {
    const cached = window.localStorage.getItem(HISTORY_CACHE_KEY)
    if (!cached) return []
    const parsed = JSON.parse(cached) as unknown
    return Array.isArray(parsed) ? parsed as CalculationRecord[] : []
  } catch {
    return []
  }
}

function writeCachedHistory(items: CalculationRecord[]) {
  try {
    window.localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(items.slice(0, 200)))
  } catch {
    // Local storage is an enhancement for serverless demo reliability.
  }
}

function statsFromHistory(items: CalculationRecord[]): StatsResponse {
  if (!items.length) return { success: true, total: 0, average: null, minimum: null, maximum: null }
  const values = items.map((item) => item.result)
  return {
    success: true,
    total: values.length,
    average: values.reduce((sum, value) => sum + value, 0) / values.length,
    minimum: Math.min(...values),
    maximum: Math.max(...values),
  }
}

function App() {
  const [expression, setExpression] = useState('')
  const [result, setResult] = useState<number | null>(null)
  const [history, setHistory] = useState<CalculationRecord[]>([])
  const [stats, setStats] = useState<StatsResponse>({ success: true, total: 0, average: null, minimum: null, maximum: null })
  const [keyword, setKeyword] = useState('')
  const [isDark, setIsDark] = useState(true)
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [justCalculated, setJustCalculated] = useState(false)
  const [copied, setCopied] = useState(false)

  const displayValue = result !== null && justCalculated ? formatResult(result) : expression || '0'
  const prettyExpression = expression ? expressionForDisplay(expression) : 'Ready for a calculation'
  const isOnline = backendStatus === 'online'

  async function refreshData(search = keyword) {
    const [historyResponse, statsResponse] = await Promise.all([getHistory(search), getStats()])
    const cached = readCachedHistory()
    const backendItems = historyResponse.items
    const sourceItems = backendItems.length ? backendItems : cached
    const visibleItems = search
      ? sourceItems.filter((item) => item.expression.toLowerCase().includes(search.toLowerCase()))
      : sourceItems
    setHistory(visibleItems)
    if (sourceItems.length) writeCachedHistory(sourceItems)
    setStats(backendItems.length ? statsResponse : statsFromHistory(sourceItems))
  }

  async function refreshBackendStatus() {
    setBackendStatus('checking')
    try {
      const online = await checkHealth()
      setBackendStatus(online ? 'online' : 'offline')
    } catch {
      setBackendStatus('offline')
    }
  }

  useEffect(() => {
    const cached = readCachedHistory()
    if (cached.length) {
      setHistory(cached)
      setStats(statsFromHistory(cached))
    }
    refreshData('').catch(() => {
      setBackendStatus('offline')
      const fallback = readCachedHistory()
      setHistory(fallback)
      setStats(statsFromHistory(fallback))
    })
    void refreshBackendStatus()
    const timer = window.setInterval(() => void refreshBackendStatus(), 8000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      getHistory(keyword).then((response) => setHistory(response.items)).catch(() => undefined)
    }, 200)
    return () => window.clearTimeout(timer)
  }, [keyword])

  function inputValue(value: string) {
    setError('')
    setCopied(false)

    if (justCalculated) {
      const startsNewExpression = /[0-9.(]/.test(value)
      const nextExpression = startsNewExpression || result === null ? value : `${result}${value}`
      setExpression(nextExpression)
      setResult(null)
      setJustCalculated(false)
      return
    }

    setExpression((current) => `${current}${value}`)
    setJustCalculated(false)
  }

  function clear() {
    setExpression('')
    setResult(null)
    setError('')
    setCopied(false)
    setJustCalculated(false)
  }

  function backspace() {
    if (justCalculated) {
      clear()
      return
    }
    setExpression((current) => current.slice(0, -1))
    setResult(null)
    setError('')
    setCopied(false)
  }

  async function submit() {
    const value = expression.trim()
    if (!value || isLoading) return
    setIsLoading(true)
    setError('')
    setCopied(false)
    try {
      const response = await calculate(value)
      setResult(response.result)
      setJustCalculated(true)
      setBackendStatus('online')
      setHistory((current) => {
        const next = [response.record, ...current.filter((item) => item.id !== response.record.id)]
        writeCachedHistory(next)
        setStats(statsFromHistory(next))
        return next
      })
      await refreshData()
    } catch (requestError) {
      setError(requestError instanceof Error ? friendlyError(requestError.message) : 'The calculation could not be completed.')
      setResult(null)
      setBackendStatus((current) => current === 'checking' ? 'offline' : current)
    } finally {
      setIsLoading(false)
    }
  }

  function handleButton(value: string) {
    if (value === 'clear') return clear()
    if (value === 'backspace') return backspace()
    if (value === 'equals') return void submit()
    inputValue(value)
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return

      if (event.key === 'Enter' || event.key === '=') {
        event.preventDefault()
        void submit()
      } else if (event.key === 'Escape') clear()
      else if (event.key === 'Backspace') backspace()
      else if (/^[0-9.+\-*/()]$/.test(event.key)) inputValue(event.key)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  async function removeRecord(id: number) {
    try {
      await deleteHistory(id)
      const next = readCachedHistory().filter((item) => item.id !== id)
      writeCachedHistory(next)
      setHistory((current) => current.filter((item) => item.id !== id))
      setStats(statsFromHistory(next))
      await refreshData()
    } catch (requestError) {
      setError(requestError instanceof Error ? friendlyError(requestError.message) : 'Unable to delete this history item.')
    }
  }

  async function removeAll() {
    if (!history.length) return
    try {
      await clearHistory()
      writeCachedHistory([])
      setHistory([])
      setStats(statsFromHistory([]))
      await refreshData()
    } catch (requestError) {
      setError(requestError instanceof Error ? friendlyError(requestError.message) : 'Unable to clear history.')
    }
  }

  async function copyResult() {
    if (result === null) return
    const text = String(result)

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        const copiedSuccessfully = document.execCommand('copy')
        textarea.remove()
        if (!copiedSuccessfully) throw new Error('Copy command was rejected')
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setError('Copy failed. Please copy the result manually.')
    }
  }

  const statsSummary = useMemo(() => {
    if (!stats.total) return 'No statistics yet'
    return `Average ${formatResult(stats.average ?? 0)} · Range ${formatResult(stats.minimum ?? 0)}—${formatResult(stats.maximum ?? 0)}`
  }, [stats])

  const backendStatusLabel = backendStatus === 'checking' ? 'Checking backend' : isOnline ? 'Backend online' : 'Backend offline'

  return (
    <div className={isDark ? 'app-shell dark' : 'app-shell'}>
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><Calculator size={21} strokeWidth={2.5} /></div>
          <div>
            <div className="brand-name">Calcura</div>
            <div className="brand-caption">SECURE CALCULATION STUDIO</div>
          </div>
        </div>
        <div className="topbar-actions">
          <div className={isOnline ? 'status-chip online' : 'status-chip'} role="status" aria-live="polite" title="Live status of the calculation API">
            <span className="status-dot" /> {backendStatusLabel}
          </div>
          <button className="icon-button" aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'} title={isDark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setIsDark((value) => !value)}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <main className="content-grid">
        <section className="calculator-card card-surface">
          <div className="section-kicker"><Sparkles size={14} /> BACKEND-FIRST CALCULATOR</div>
          <div className="calculator-heading">
            <div>
              <h1>Clear calculations, <span>reliable history.</span></h1>
              <p>Expressions are safely parsed by the backend and every result is saved automatically.</p>
            </div>
            <div className={isOnline ? 'api-badge online' : 'api-badge'} role="status" aria-live="polite"><Wifi size={15} /> {backendStatusLabel.toUpperCase()}</div>
          </div>

          <div className="display-panel" aria-live="polite">
            <div className="display-meta"><span>{justCalculated ? 'Calculation result' : 'Current expression'}</span><span className="display-hint"><Command size={12} /> Keyboard supported</span></div>
            <div className="display-expression">{prettyExpression}</div>
            <div className={error ? 'display-result error' : 'display-result'}>{error || displayValue}</div>
            <div className="display-footer">
              <span>{isLoading ? 'Calculating with the backend…' : result !== null && justCalculated ? 'Result returned by the backend' : 'Enter an expression, then press Enter'}</span>
              <button className="copy-button" onClick={() => void copyResult()} disabled={result === null} aria-label="Copy result" title={result === null ? 'Calculate a result first' : 'Copy result'}>{copied ? <Check size={14} /> : <Clipboard size={14} />} {copied ? 'Copied' : 'Copy result'}</button>
            </div>
          </div>

          <div className="keypad" role="group" aria-label="Calculator keypad">
            {buttons.map((button) => <button key={button.value} className={`key ${button.kind}`} onClick={() => handleButton(button.value)} disabled={isLoading} aria-label={button.label === '⌫' ? 'Backspace' : button.label}>{button.label}</button>)}
          </div>
          <div className="calculator-note"><Activity size={14} /> The backend performs the calculation; the frontend only displays the result.</div>
        </section>

        <aside className="history-card card-surface">
          <div className="history-heading">
            <div><div className="section-kicker"><History size={14} /> ACTIVITY LOG</div><h2>Calculation history</h2></div>
            <button className="text-button danger" onClick={() => void removeAll()} disabled={!history.length} aria-label="Clear calculation history"><Trash2 size={14} /> Clear</button>
          </div>
          <div className="stats-row">
            <div className="stat-box"><span>Total calculations</span><strong>{stats.total}</strong></div>
            <div className="stat-box stat-wide"><span>Result overview</span><strong>{statsSummary}</strong></div>
          </div>
          <label className="search-box"><Search size={16} /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Search expressions…" aria-label="Search calculation history" /><kbd>/</kbd></label>
          <div className="history-list">
            {history.length ? history.map((record) => <div className="history-item" key={record.id}><div className="history-item-main"><div className="history-expression">{expressionForDisplay(record.expression)}</div><div className="history-time"><Clock3 size={12} /> {formatTime(record.created_at)}</div></div><div className="history-item-result">{formatResult(record.result)}</div><button className="delete-button" aria-label={`Delete ${record.expression}`} title="Delete record" onClick={() => void removeRecord(record.id)}><X size={15} /></button></div>) : <div className="empty-state"><ArrowDownLeft size={24} /><strong>No calculations yet</strong><span>Complete your first calculation and it will appear here.</span></div>}
          </div>
          <div className="history-footer"><span><span className="live-dot" /> Backend history with local session cache</span><span>{history.length} {history.length === 1 ? 'result' : 'results'}</span></div>
        </aside>
      </main>
      <footer className="footer"><span>Calcura · Front-end / Back-end Separation Assignment</span><span>FastAPI · SQLite · React</span></footer>
    </div>
  )
}

export default App
