import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  Check,
  Clipboard,
  Clock3,
  Command,
  Download,
  History,
  Moon,
  Search,
  Sparkles,
  Star,
  Sun,
  Trash2,
  Wifi,
  X,
} from 'lucide-react'
import { API_BASE_URL, calculate, clearHistory, deleteHistory, downloadHistory, getHealth, getHistory, getStats, preview, toggleFavorite } from './services/api'
import type { CalculationRecord, StatsResponse } from './types/api'

const buttons = [
  { label: 'AC', value: 'clear', kind: 'utility', aria: 'All clear' },
  { label: 'DEL', value: 'backspace', kind: 'utility', aria: 'Delete' },
  { label: '(', value: '(', kind: 'utility', aria: 'Left parenthesis' },
  { label: ')', value: ')', kind: 'utility', aria: 'Right parenthesis' },
  { label: '÷', value: '/', kind: 'operator', aria: 'Divide' },
  { label: '7', value: '7', kind: 'number', aria: '7' },
  { label: '8', value: '8', kind: 'number', aria: '8' },
  { label: '9', value: '9', kind: 'number', aria: '9' },
  { label: '×', value: '*', kind: 'operator', aria: 'Multiply' },
  { label: '−', value: '-', kind: 'operator', aria: 'Subtract' },
  { label: '4', value: '4', kind: 'number', aria: '4' },
  { label: '5', value: '5', kind: 'number', aria: '5' },
  { label: '6', value: '6', kind: 'number', aria: '6' },
  { label: '+', value: '+', kind: 'operator', aria: 'Add' },
  { label: '.', value: '.', kind: 'number', aria: 'Decimal point' },
  { label: '1', value: '1', kind: 'number', aria: '1' },
  { label: '2', value: '2', kind: 'number', aria: '2' },
  { label: '3', value: '3', kind: 'number', aria: '3' },
  { label: '0', value: '0', kind: 'number', aria: '0' },
  { label: '=', value: 'equals', kind: 'equals', aria: 'Equals' },
] as const

const functions = [
  { label: 'sin', value: 'sin(', aria: 'Sine in degrees' },
  { label: 'cos', value: 'cos(', aria: 'Cosine in degrees' },
  { label: 'tan', value: 'tan(', aria: 'Tangent in degrees' },
  { label: 'ln', value: 'ln(', aria: 'Natural logarithm' },
  { label: 'log', value: 'log(', aria: 'Base-10 logarithm' },
  { label: '√', value: 'sqrt(', aria: 'Square root' },
  { label: 'x^y', value: '^', aria: 'Power' },
  { label: '%', value: '%', aria: 'Percent' },
  { label: 'n!', value: '!', aria: 'Factorial' },
  { label: '|x|', value: 'abs(', aria: 'Absolute value' },
  { label: 'Ans', value: 'Ans', aria: 'Previous answer' },
  { label: 'π', value: 'pi', aria: 'Pi' },
  { label: 'e', value: 'e', aria: 'Euler number' },
] as const

type BackendStatus = 'checking' | 'online' | 'offline'

function Pebble({ className = 'pebble' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 148" aria-hidden="true">
      <ellipse cx="78" cy="118" rx="16" ry="7" fill="#7ec8ff" stroke="#2b211c" strokeWidth="3" />
      <path d="M62 108c8 10 22 14 34 8" fill="none" stroke="#2b211c" strokeWidth="3" strokeLinecap="round" />
      <rect x="86" y="96" width="16" height="34" rx="4" transform="rotate(24 94 113)" fill="#ffc83d" stroke="#2b211c" strokeWidth="3" />
      <polygon points="92,128 112,126 102,142" fill="#ff8d6a" stroke="#2b211c" strokeWidth="3" strokeLinejoin="round" />
      <ellipse cx="58" cy="78" rx="40" ry="36" fill="#ffd8b8" stroke="#2b211c" strokeWidth="3" />
      <ellipse cx="54" cy="42" rx="30" ry="14" fill="#ff6b4a" stroke="#2b211c" strokeWidth="3" />
      <circle cx="80" cy="36" r="6" fill="#ffc83d" stroke="#2b211c" strokeWidth="3" />
      <circle cx="46" cy="76" r="3.4" fill="#2b211c" />
      <circle cx="68" cy="76" r="3.4" fill="#2b211c" />
      <ellipse cx="38" cy="86" rx="6" ry="3.4" fill="#ff9b8d" />
      <ellipse cx="78" cy="86" rx="6" ry="3.4" fill="#ff9b8d" />
      <path d="M48 94c4 6 14 6 18 0" fill="none" stroke="#2b211c" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}


function isNetworkError(error: unknown) {
  if (!(error instanceof Error)) return true
  const message = error.message.toLowerCase()
  return message.includes('failed to fetch') || message.includes('networkerror') || message.includes('network') || message.includes('backend is running') || message.includes('request failed')
}

function friendlyError(message: string) {
  if (message.includes('Division by zero')) return 'Division by zero is not allowed.'
  if (message.includes('Square root')) return 'Square root of a negative number is not allowed.'
  if (message.includes('Factorial')) return 'Factorial only accepts integers from 0 to 170.'
  if (message.includes('Ans is not available')) return 'Ans is not available yet. Complete a calculation first.'
  if (message.includes('Invalid') || message.includes('Expected') || message.includes('Unexpected') || message.includes('Missing') || message.includes('Unknown')) {
    return 'Invalid expression. Check the numbers, operators, and parentheses.'
  }
  if (message.includes('Unsupported')) return 'Unsupported character. Use numbers, parentheses, and the calculator functions.'
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) return 'The backend is unavailable. Check the network and try again.'
  return message || 'The calculation could not be completed.'
}

function plainNumber(value: number) {
  if (!Number.isFinite(value)) return ''
  const text = Object.is(value, -0) ? '0' : value.toFixed(10).replace(/\.?0+$/, '')
  return text === '-0' ? '0' : text
}

function formatResult(value: number) {
  if (!Number.isFinite(value)) return 'Unavailable'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 10 }).format(value)
}

function formatStat(value: number) {
  if (!Number.isFinite(value)) return 'Unavailable'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(value)
}

function formatTime(value: string) {
  const normalizedValue = value.includes('T') && !/[zZ]|[+-]\d{2}:\d{2}$/.test(value) ? `${value}Z` : value
  const date = new Date(normalizedValue)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '00'
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}:${part('second')}`
}

function expressionForDisplay(value: string) {
  return value.replaceAll('*', ' × ').replaceAll('/', ' ÷ ').replaceAll('+', ' + ').replaceAll('-', ' − ').replaceAll('^', ' ^ ').replace(/\s+/g, ' ').trim()
}

function startsFresh(value: string) {
  return /^[0-9.(]/.test(value) || value.endsWith('(') || value === 'pi' || value === 'e' || value === 'Ans'
}

const HISTORY_CACHE_KEY = 'calcura-history-cache-v2'
const THEME_KEY = 'calcura-theme'

function normalizeRecord(item: CalculationRecord): CalculationRecord {
  return { ...item, is_favorite: Boolean(item.is_favorite), steps: Array.isArray(item.steps) ? item.steps : [] }
}

function readCachedHistory(): CalculationRecord[] {
  try {
    const cached = window.localStorage.getItem(HISTORY_CACHE_KEY)
    if (!cached) return []
    const parsed = JSON.parse(cached) as unknown
    return Array.isArray(parsed) ? parsed.map((item) => normalizeRecord(item as CalculationRecord)) : []
  } catch {
    return []
  }
}

function writeCachedHistory(items: CalculationRecord[]) {
  try {
    window.localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(items.slice(0, 200).map(normalizeRecord)))
  } catch {
    // Cache is only a fallback when the backend cannot be reached.
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
  const [steps, setSteps] = useState<string[]>([])
  const [history, setHistory] = useState<CalculationRecord[]>([])
  const [stats, setStats] = useState<StatsResponse>({ success: true, total: 0, average: null, minimum: null, maximum: null })
  const [keyword, setKeyword] = useState('')
  const [isDark, setIsDark] = useState(() => window.localStorage.getItem(THEME_KEY) !== 'light')
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [justCalculated, setJustCalculated] = useState(false)
  const [copied, setCopied] = useState(false)
  const [usingCache, setUsingCache] = useState(false)
  const [databaseName, setDatabaseName] = useState('checking')
  const [showConnection, setShowConnection] = useState(false)
  const [notice, setNotice] = useState('')
  const requestSerial = useRef(0)
  const searchSerial = useRef(0)
  const saveQueue = useRef(Promise.resolve())
  const expressionRef = useRef('')

  const shownNumber = result !== null && justCalculated ? result : null
  const displayValue = shownNumber !== null ? formatResult(shownNumber) : expression || '0'
  expressionRef.current = expression
  const prettyExpression = expression ? expressionForDisplay(expression) : 'Ready for a calculation'
  const isOnline = backendStatus === 'online'

  async function refreshData(search = keyword) {
    const [historyResponse, statsResponse] = await Promise.all([getHistory(search), getStats()])
    const items = historyResponse.items.map(normalizeRecord)
    setHistory(items)
    setStats(statsResponse)
    setUsingCache(false)
    if (!search) writeCachedHistory(items)
  }

  async function refreshBackendStatus() {
    try {
      const health = await getHealth()
      setBackendStatus(health.status === 'ok' ? 'online' : 'offline')
      setDatabaseName(health.database ?? 'unknown')
    } catch {
      setBackendStatus('offline')
      setDatabaseName('unavailable')
    }
  }

  useEffect(() => {
    const cached = readCachedHistory()
    if (cached.length) {
      setHistory(cached)
      setStats(statsFromHistory(cached))
      setUsingCache(true)
    }
    refreshData('').catch(() => {
      setBackendStatus('offline')
      setUsingCache(true)
    })
    void refreshBackendStatus()
    // Keep the API process and its HTTPS connection warm without
    // evaluating an expression or creating calculation history.
    const warm = () => {
      if (document.visibilityState !== 'visible') return
      void refreshBackendStatus()
    }
    warm()
    const timer = window.setInterval(warm, 8000)
    document.addEventListener('visibilitychange', warm)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', warm)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light')
  }, [isDark])

  useEffect(() => {
    const serial = searchSerial.current + 1
    searchSerial.current = serial
    const timer = window.setTimeout(() => {
      getHistory(keyword)
        .then((response) => {
          if (serial !== searchSerial.current) return
          setHistory(response.items.map(normalizeRecord))
          setUsingCache(false)
        })
        .catch(() => {
          if (serial !== searchSerial.current) return
          const cached = readCachedHistory().filter((item) => item.expression.toLowerCase().includes(keyword.toLowerCase()))
          setHistory(cached)
          setUsingCache(true)
        })
    }, 200)
    return () => window.clearTimeout(timer)
  }, [keyword])

  function inputValue(value: string) {
    setError('')
    setCopied(false)
    setSteps([])
    let nextValue = value
    if (value === 'Ans') {
      if (result === null) {
        setError('Ans is not available yet. Complete a calculation first.')
        return
      }
      nextValue = plainNumber(result)
    }
    if (justCalculated) {
      const nextExpression = startsFresh(nextValue) || result === null ? nextValue : `${plainNumber(result)}${nextValue}`
      setExpression(nextExpression)
      setResult(null)
      setJustCalculated(false)
      return
    }
    setExpression((current) => `${current}${nextValue}`)
    setJustCalculated(false)
  }

  function clear() {
    setExpression('')
    setResult(null)
    setSteps([])
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
    setSteps([])
    setError('')
    setCopied(false)
  }

  function queueSave(value: string, serial: number, previewOk: boolean) {
    saveQueue.current = saveQueue.current.then(async () => {
      try {
        const saved = await calculate(value)
        if (serial !== requestSerial.current) return
        const record = normalizeRecord(saved.record)
        if (!previewOk && expressionRef.current.trim() === value) {
          setResult(saved.result)
          setSteps(saved.steps ?? record.steps ?? [])
          setJustCalculated(true)
          setError('')
        }
        setBackendStatus('online')
        setUsingCache(false)
        if (serial === requestSerial.current) {
          setNotice('')
          setIsLoading(false)
        }
        try {
          await refreshData('')
        } catch {
          if (serial === requestSerial.current) setUsingCache(true)
        }
      } catch (requestError) {
        if (serial !== requestSerial.current) return
        setIsLoading(false)
        if (previewOk) {
          setNotice('Result returned by the backend. History could not be saved yet.')
        } else if (expressionRef.current.trim() === value) {
          setError(requestError instanceof Error ? friendlyError(requestError.message) : 'The calculation could not be completed.')
        }
      }
    })
  }

  async function submit() {
    const value = expressionRef.current.trim()
    if (!value) return
    const serial = requestSerial.current + 1
    requestSerial.current = serial
    setError('')
    setCopied(false)
    setNotice('')
    const slowTimer = window.setTimeout(() => {
      if (requestSerial.current === serial) setIsLoading(true)
    }, 160)
    let previewOk = false
    let waitingForFallback = false
    try {
      const response = await preview(value)
      if (serial !== requestSerial.current || expressionRef.current.trim() !== value) return
      setResult(response.result)
      setSteps(response.steps ?? [])
      setJustCalculated(true)
      setBackendStatus('online')
      setNotice('Result returned by the backend. Saving history...')
      previewOk = true
    } catch (requestError) {
      if (serial !== requestSerial.current || expressionRef.current.trim() !== value) return
      if (isNetworkError(requestError)) {
        waitingForFallback = true
        setIsLoading(true)
      } else {
        setError(requestError instanceof Error ? friendlyError(requestError.message) : 'The calculation could not be completed.')
        setResult(null)
        setSteps([])
        setBackendStatus((current) => current === 'checking' ? 'offline' : current)
      }
    } finally {
      window.clearTimeout(slowTimer)
      if (serial === requestSerial.current && !waitingForFallback) setIsLoading(false)
    }
    if (!previewOk && !waitingForFallback) return
    queueSave(value, serial, previewOk)
  }

  function handleButton(value: string) {
    if (value === 'clear') return clear()
    if (value === 'backspace') return backspace()
    if (value === 'equals') return void submit()
    inputValue(value)
  }

  function reuse(record: CalculationRecord) {
    setExpression(record.expression)
    setResult(record.result)
    setSteps(record.steps ?? [])
    setJustCalculated(true)
    setError('')
    setCopied(false)
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return
      if (event.key === '/') {
        event.preventDefault()
        document.getElementById('history-search')?.focus()
        return
      }
      if (event.key === 'Enter' || event.key === '=') {
        event.preventDefault()
        void submit()
      } else if (event.key === 'Escape') clear()
      else if (event.key === 'Backspace') backspace()
      else if (event.key === ' ') inputValue(' ')
      else if (/^[0-9.+\-*/()^%!a-zA-Z]$/.test(event.key)) inputValue(event.key)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  async function removeRecord(id: number) {
    try {
      await deleteHistory(id)
      await refreshData('')
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
      setUsingCache(false)
      await refreshData('')
    } catch (requestError) {
      setError(requestError instanceof Error ? friendlyError(requestError.message) : 'Unable to clear history.')
    }
  }

  async function markFavorite(id: number) {
    try {
      const response = await toggleFavorite(id)
      const updated = normalizeRecord(response.record)
      setHistory((current) => current.map((item) => item.id === id ? updated : item))
    } catch (requestError) {
      setError(requestError instanceof Error ? friendlyError(requestError.message) : 'Unable to update this favorite.')
    }
  }

  async function exportHistory() {
    try {
      await downloadHistory()
    } catch (requestError) {
      setError(requestError instanceof Error ? friendlyError(requestError.message) : 'Unable to export history.')
    }
  }

  async function copyText(text: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return
      }
    } catch {
      // Some browsers expose clipboard but reject the write. Fall through.
    }
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '0'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    textarea.setSelectionRange(0, text.length)
    const copiedSuccessfully = document.execCommand('copy')
    textarea.remove()
    if (!copiedSuccessfully) throw new Error('Copy command was rejected')
  }

  async function copyResult() {
    if (shownNumber === null) return
    try {
      await copyText(plainNumber(shownNumber))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setError('Copy failed. Select the result and copy it manually.')
    }
  }

  const statsSummary = useMemo(() => {
    if (!stats.total) return 'No statistics yet'
    return `Average ${formatStat(stats.average ?? 0)} · Range ${formatStat(stats.minimum ?? 0)}–${formatStat(stats.maximum ?? 0)}`
  }, [stats])

  const backendStatusLabel = backendStatus === 'checking' ? 'Checking backend' : isOnline ? 'Backend online' : 'Backend offline'

  return (
    <div className={isDark ? 'app-shell dark' : 'app-shell'}>
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><Pebble className="brand-pebble" /></div>
          <div>
            <div className="brand-name">Calcura</div>
            <div className="brand-caption">PEBBLE CRAYON STUDIO</div>
          </div>
        </div>
        <div className="topbar-actions">
          <a className="docs-link" href={`${API_BASE_URL}/docs`} target="_blank" rel="noreferrer">API docs</a>
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
            <div className="title-row"><div>
              <h1>Clear calculations, <span>in my own colors.</span></h1>
              <p>The backend parses every expression and returns the answer first. History is saved in the background.</p>
            </div>
            <div className="pebble-sticker"><Pebble className="heading-pebble" /><span>Pebble</span></div></div>
            <button type="button" className={isOnline ? 'api-badge online' : 'api-badge'} aria-expanded={showConnection} aria-controls="api-connection-panel" onClick={() => setShowConnection((open) => !open)}><Wifi size={15} /> API connection</button>
          </div>


          {showConnection && (
            <section className="connection-panel" id="api-connection-panel">
              <div className="connection-title"><Wifi size={15} /> API connection</div>
              <p>This panel shows the live link between this page and the calculation service. Arithmetic still happens only on the backend. A normal expression is answered before the database write.</p>
              <dl>
                <div><dt>Status</dt><dd>{backendStatusLabel}</dd></div>
                <div><dt>API address</dt><dd>{API_BASE_URL}</dd></div>
                <div><dt>Health check</dt><dd>/api/health</dd></div>
                <div><dt>Preview</dt><dd>POST /api/preview</dd></div>
                <div><dt>Calculate</dt><dd>POST /api/calculate</dd></div>
                <div><dt>History</dt><dd>GET /api/history</dd></div>
                <div><dt>Database</dt><dd>{databaseName}</dd></div>
              </dl>
              <a href={`${API_BASE_URL}/docs`} target="_blank" rel="noreferrer">Open API documentation</a>
            </section>
          )}

          <div className="display-panel" aria-live="polite">
            <div className="display-meta"><span>{justCalculated ? 'Calculation result' : 'Current expression'}</span><span className="display-hint"><Command size={12} /> Keyboard supported</span></div>
            <div className="display-expression">{prettyExpression}</div>
            <div className={error ? 'display-result error' : 'display-result'}>{error || displayValue}</div>
            {steps.length > 0 && <ol className="steps" aria-label="Backend calculation steps">{steps.map((step, index) => <li key={`${step}-${index}`}>{step}</li>)}</ol>}
            <div className="display-footer">
              <span>{isLoading ? 'Calculating with the backend...' : notice ? notice : result !== null && justCalculated ? 'Result returned by the backend' : 'Enter an expression, then press = or Enter'}</span>
              <button className="copy-button" onClick={() => void copyResult()} disabled={shownNumber === null} aria-label="Copy result" title={shownNumber === null ? 'Calculate a result first' : 'Copy result'}>{copied ? <Check size={14} /> : <Clipboard size={14} />} {copied ? 'Copied' : 'Copy result'}</button>
            </div>
          </div>

          <div className="function-row" role="group" aria-label="Scientific functions">
            {functions.map((button) => <button key={button.aria} className="key function" onClick={() => handleButton(button.value)} aria-label={button.aria} title={button.aria}>{button.label}</button>)}
          </div>
          <div className="keypad" role="group" aria-label="Calculator keypad">
            {buttons.map((button) => <button key={button.value} className={`key ${button.kind}`} onClick={() => handleButton(button.value)} aria-label={button.aria}>{button.label}</button>)}
          </div>
          <div className="calculator-note"><Activity size={14} /> The backend calculates only after you press = or Enter. A successful result is then saved to history.</div>
        </section>

        <aside className="history-card card-surface">
          <div className="history-heading">
            <div><div className="section-kicker"><History size={14} /> ACTIVITY LOG</div><h2>Calculation history</h2></div>
            <div className="history-actions">
              <button className="text-button" onClick={() => void exportHistory()} disabled={!history.length} aria-label="Export calculation history"><Download size={14} /> Export</button>
              <button className="text-button danger" onClick={() => void removeAll()} disabled={!history.length} aria-label="Clear calculation history"><Trash2 size={14} /> Clear</button>
            </div>
          </div>
          <div className="stats-row">
            <div className="stat-box"><span>Total calculations</span><strong>{stats.total}</strong></div>
            <div className="stat-box stat-wide"><span>Result overview</span><strong>{statsSummary}</strong></div>
          </div>
          <label className="search-box"><Search size={16} /><input id="history-search" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Search expressions" aria-label="Search calculation history" /><kbd>/</kbd></label>
          <div className="history-list">
            {history.length ? history.map((record) => (
              <div className="history-item" key={record.id}>
                <button className="history-reuse" onClick={() => reuse(record)} title="Load this expression">
                  <div className="history-item-main">
                    <div className="history-expression">{expressionForDisplay(record.expression)}</div>
                    <div className="history-time" title={record.created_at}><Clock3 size={12} /> {formatTime(record.created_at)}</div>
                  </div>
                  <div className="history-item-result">{formatResult(record.result)}</div>
                </button>
                <button className={record.is_favorite ? 'favorite-button active' : 'favorite-button'} aria-label={record.is_favorite ? `Unfavorite ${record.expression}` : `Favorite ${record.expression}`} title={record.is_favorite ? 'Remove favorite' : 'Mark as favorite'} onClick={() => void markFavorite(record.id)}><Star size={15} /></button>
                <button className="delete-button" aria-label={`Delete ${record.expression}`} title="Delete record" onClick={() => void removeRecord(record.id)}><X size={15} /></button>
              </div>
            )) : <div className="empty-state"><Pebble className="empty-pebble" /><strong>{keyword ? 'No matching calculations' : 'No calculations yet'}</strong><span>{keyword ? 'Try another keyword from an expression.' : 'Complete your first calculation and it will appear here.'}</span></div>}
          </div>
          <div className="history-footer"><span><span className="live-dot" /> {usingCache ? 'Offline cache. Reconnect to load the database.' : 'Saved in the backend database'}</span><span>{history.length} {history.length === 1 ? 'result' : 'results'}</span></div>
        </aside>
      </main>
      <footer className="footer"><span>Calcura · Front-end / Back-end Separation Assignment</span><span>FastAPI · {databaseName === 'postgresql' ? 'PostgreSQL' : databaseName === 'sqlite' ? 'SQLite' : 'Database'} · React</span></footer>
    </div>
  )
}

export default App
