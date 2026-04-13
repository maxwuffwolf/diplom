'use client'

import { useMemo, useState } from 'react'
import { percentile, toCsv, type PayloadSize, type RenderMode } from '@/lib/benchmark'

type RunMode = RenderMode | 'all'

type RunResult = {
  timestamp: string
  mode: RenderMode
  size: PayloadSize
  run: string
  ttfb: number
  fcp: number
  lcp: number
  tti: number
  cls: number
  hydration: number
  jsBundleKb: number
  apiRequests: number
}

const MODES: RunMode[] = ['all', 'csr', 'ssr', 'ssg']
const SIZES: PayloadSize[] = ['small', 'medium', 'large']

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function summarize(results: RunResult[]) {
  const grouped = new Map<string, RunResult[]>()
  for (const result of results) {
    const key = `${result.mode}:${result.size}`
    const list = grouped.get(key) ?? []
    list.push(result)
    grouped.set(key, list)
  }

  return [...grouped.entries()].map(([key, list]) => {
    const [mode, size] = key.split(':')
    return {
      mode,
      size,
      runs: list.length,
      medianFcp: percentile(list.map((item) => item.fcp), 50),
      p90Fcp: percentile(list.map((item) => item.fcp), 90),
      medianLcp: percentile(list.map((item) => item.lcp), 50),
      p90Lcp: percentile(list.map((item) => item.lcp), 90),
      medianTti: percentile(list.map((item) => item.tti), 50),
      medianHydration: percentile(list.map((item) => item.hydration), 50),
      medianTtfb: percentile(list.map((item) => item.ttfb), 50),
      medianJsBundleKb: percentile(list.map((item) => item.jsBundleKb), 50),
      medianApiRequests: percentile(list.map((item) => item.apiRequests), 50),
    }
  })
}

export function BenchmarkControl() {
  const [mode, setMode] = useState<RunMode>('all')
  const [size, setSize] = useState<PayloadSize>('small')
  const [runs, setRuns] = useState(5)
  const [isRunning, setIsRunning] = useState(false)
  const [status, setStatus] = useState('Idle')
  const [currentSrc, setCurrentSrc] = useState('')
  const [results, setResults] = useState<RunResult[]>([])

  const summary = useMemo(() => summarize(results), [results])

  const modePlan: RenderMode[] = mode === 'all' ? ['csr', 'ssr', 'ssg'] : [mode]

  async function runSingle(entryMode: RenderMode, index: number) {
    const src = `/${entryMode}/${size}?autorun=1&run=${index + 1}&seed=${Date.now()}`
    setCurrentSrc(src)
    setStatus(`Running ${entryMode.toUpperCase()} ${size} (${index + 1}/${runs})`)

    await new Promise<void>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        window.removeEventListener('message', onMessage)
        reject(new Error(`Timeout on ${entryMode} run ${index + 1}`))
      }, 30000)

      function onMessage(event: MessageEvent) {
        if (event.origin !== window.location.origin) return
        if (!event.data || event.data.type !== 'benchmark-result') return
        const payload = event.data.payload as RunResult
        if (payload.mode !== entryMode || payload.size !== size || payload.run !== String(index + 1)) return

        window.clearTimeout(timeoutId)
        window.removeEventListener('message', onMessage)
        setResults((prev) => [...prev, payload])
        resolve()
      }

      window.addEventListener('message', onMessage)
    })
  }

  async function runSeries() {
    setIsRunning(true)
    setStatus('Preparing run...')
    setResults([])

    try {
      for (const entryMode of modePlan) {
        for (let index = 0; index < runs; index++) {
          await runSingle(entryMode, index)
        }
      }
      setStatus('Completed')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown benchmark error'
      setStatus(`Failed: ${message}`)
    } finally {
      setIsRunning(false)
    }
  }

  function exportJson() {
    download('benchmark-results.json', JSON.stringify(results, null, 2), 'application/json')
  }

  function exportCsv() {
    download('benchmark-results.csv', toCsv(results), 'text/csv;charset=utf-8')
  }

  return (
    <div className="benchmark-panel">
      <div className="form-row">
        <strong>Benchmark Control</strong>
        <span style={{ color: '#94a3b8', fontSize: 12 }}>
          Stable stand: fixed machine/browser, no background tasks, 5-10 runs, median+p90.
        </span>
      </div>

      <div className="form-row">
        <label htmlFor="mode">Approach</label>
        <select id="mode" value={mode} onChange={(event) => setMode(event.target.value as RunMode)} disabled={isRunning}>
          {MODES.map((entry) => (
            <option key={entry} value={entry}>
              {entry.toUpperCase()}
            </option>
          ))}
        </select>

        <label htmlFor="size">Payload</label>
        <select id="size" value={size} onChange={(event) => setSize(event.target.value as PayloadSize)} disabled={isRunning}>
          {SIZES.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>

        <label htmlFor="runs">Runs</label>
        <input
          id="runs"
          type="number"
          min={5}
          max={10}
          value={runs}
          onChange={(event) => setRuns(Math.max(5, Math.min(10, Number(event.target.value) || 5)))}
          disabled={isRunning}
        />

        <button onClick={runSeries} disabled={isRunning}>
          {isRunning ? 'Running...' : 'Run series'}
        </button>
        <button onClick={exportJson} disabled={!results.length}>
          Export JSON
        </button>
        <button onClick={exportCsv} disabled={!results.length}>
          Export CSV
        </button>
      </div>

      <div className="form-row">
        <span>Status: {status}</span>
        <span>Samples: {results.length}</span>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Mode</th>
            <th>Payload</th>
            <th>Runs</th>
            <th>Median TTFB</th>
            <th>Median FCP</th>
            <th>P90 FCP</th>
            <th>Median LCP</th>
            <th>Median TTI</th>
            <th>Median Hydration</th>
            <th>Median JS (KB)</th>
            <th>Median API req</th>
          </tr>
        </thead>
        <tbody>
          {summary.map((row) => (
            <tr key={`${row.mode}-${row.size}`}>
              <td>{row.mode.toUpperCase()}</td>
              <td>{row.size}</td>
              <td>{row.runs}</td>
              <td>{row.medianTtfb}</td>
              <td>{row.medianFcp}</td>
              <td>{row.p90Fcp}</td>
              <td>{row.medianLcp}</td>
              <td>{row.medianTti}</td>
              <td>{row.medianHydration}</td>
              <td>{row.medianJsBundleKb}</td>
              <td>{row.medianApiRequests}</td>
            </tr>
          ))}
          {!summary.length && (
            <tr>
              <td colSpan={11}>No benchmark data yet.</td>
            </tr>
          )}
        </tbody>
      </table>

      <iframe title="benchmark-runner" className="runner" src={currentSrc || '/csr/small'} />
    </div>
  )
}
