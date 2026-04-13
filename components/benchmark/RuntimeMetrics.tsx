'use client'

import { useEffect, useRef, useState } from 'react'
import type { PayloadSize, RenderMode } from '@/lib/benchmark'

type Metrics = {
  ttfb: number
  fcp: number
  lcp: number
  tti: number
  cls: number
  hydration: number
  jsBundleKb: number
  apiRequests: number
}

const initialMetrics: Metrics = {
  ttfb: 0,
  fcp: 0,
  lcp: 0,
  tti: 0,
  cls: 0,
  hydration: 0,
  jsBundleKb: 0,
  apiRequests: 0,
}

function recordToStorage(record: Record<string, string | number>) {
  try {
    const raw = window.localStorage.getItem('benchmark.logs')
    const list = raw ? (JSON.parse(raw) as Array<Record<string, string | number>>) : []
    list.push(record)
    window.localStorage.setItem('benchmark.logs', JSON.stringify(list))
  } catch {
    // noop
  }
}

function round(value: number) {
  return Number(value.toFixed(2))
}

export function RuntimeMetrics({
  mode,
  size,
  autoReport,
  run,
}: {
  mode: RenderMode
  size: PayloadSize
  autoReport: boolean
  run: string
}) {
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics)
  const [ready, setReady] = useState(false)
  const lcpRef = useRef(0)
  const clsRef = useRef(0)
  const sentRef = useRef(false)
  const hydrationMarkRef = useRef(0)

  useEffect(() => {
    hydrationMarkRef.current = performance.now()

    const lcpObserver = new PerformanceObserver((entries) => {
      const entry = entries.getEntries().at(-1)
      if (entry) lcpRef.current = entry.startTime
    })
    const clsObserver = new PerformanceObserver((entries) => {
      for (const entry of entries.getEntries()) {
        const layoutShift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean }
        if (!layoutShift.hadRecentInput) clsRef.current += layoutShift.value ?? 0
      }
    })

    try {
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
      clsObserver.observe({ type: 'layout-shift', buffered: true })
    } catch {
      // unsupported browsers
    }

    const idleTick = () => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      const paints = performance.getEntriesByType('paint')
      const fcp = paints.find((entry) => entry.name === 'first-contentful-paint')?.startTime ?? 0
      const apiRequests = performance
        .getEntriesByType('resource')
        .filter(
          (entry) =>
            (entry as PerformanceResourceTiming).initiatorType === 'fetch' ||
            entry.name.includes('/api/benchmark'),
        ).length

      const jsBundleBytes = performance
        .getEntriesByType('resource')
        .filter((entry) => (entry as PerformanceResourceTiming).initiatorType === 'script')
        .reduce((sum, entry) => {
          const resource = entry as PerformanceResourceTiming
          return sum + (resource.transferSize || resource.encodedBodySize || 0)
        }, 0)

      const nextMetrics: Metrics = {
        ttfb: round(nav ? nav.responseStart - nav.requestStart : 0),
        fcp: round(fcp),
        lcp: round(lcpRef.current),
        tti: round(performance.now()),
        cls: round(clsRef.current),
        hydration: round(hydrationMarkRef.current),
        jsBundleKb: round(jsBundleBytes / 1024),
        apiRequests,
      }

      setMetrics(nextMetrics)
      setReady(true)

      const record = {
        timestamp: new Date().toISOString(),
        mode,
        size,
        run,
        ...nextMetrics,
      }
      recordToStorage(record)

      if (autoReport && !sentRef.current) {
        sentRef.current = true
        window.parent.postMessage(
          {
            type: 'benchmark-result',
            payload: record,
          },
          window.location.origin,
        )
      }
    }

    const onLoad = () => {
      window.setTimeout(() => {
        if ('requestIdleCallback' in window) {
          window.requestIdleCallback(idleTick)
        } else {
          idleTick()
        }
      }, 500)
    }

    if (document.readyState === 'complete') {
      onLoad()
    } else {
      window.addEventListener('load', onLoad, { once: true })
    }

    return () => {
      lcpObserver.disconnect()
      clsObserver.disconnect()
      window.removeEventListener('load', onLoad)
    }
  }, [autoReport, mode, run, size])

  return (
    <aside className="metrics">
      <h3>Runtime metrics ({mode.toUpperCase()})</h3>
      <div className="mrow">
        <span>TTFB</span>
        <strong>{metrics.ttfb} ms</strong>
      </div>
      <div className="mrow">
        <span>FCP</span>
        <strong>{metrics.fcp} ms</strong>
      </div>
      <div className="mrow">
        <span>LCP</span>
        <strong>{metrics.lcp} ms</strong>
      </div>
      <div className="mrow">
        <span>TTI (approx)</span>
        <strong>{metrics.tti} ms</strong>
      </div>
      <div className="mrow">
        <span>CLS</span>
        <strong>{metrics.cls}</strong>
      </div>
      <div className="mrow">
        <span>Hydration</span>
        <strong>{metrics.hydration} ms</strong>
      </div>
      <div className="mrow">
        <span>JS bundle</span>
        <strong>{metrics.jsBundleKb} KB</strong>
      </div>
      <div className="mrow">
        <span>API requests</span>
        <strong>{metrics.apiRequests}</strong>
      </div>
      <div className="mrow">
        <span>Status</span>
        <strong>{ready ? 'captured' : 'collecting...'}</strong>
      </div>
    </aside>
  )
}
