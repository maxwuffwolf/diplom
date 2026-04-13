// App.tsx
// Головний потік виконує мінімум роботи в гарячому шляху:
//
// DOM режим:   dataGenerator → [binary copy ~0.5ms] → dataBuffer (ref) → DomRenderer RAF
// WebGL режим: dataGenerator → [binary copy ~0.5ms] → webglWorkerBridge → [transfer ~0ms] → webgl.worker RAF
//
// Жодних Zustand setPoints, жодних React ре-рендерів при кожному кадрі.

import { useEffect, useRef } from 'react'
import { RenderPanel }        from './components/RenderPanel'
import { MetricsOverlay }     from './components/MetricsOverlay'
import { Controls }           from './components/Controls'
import { useBenchmarkStore }  from './store/benchmarkStore'
import { dataBuffer }         from './store/dataBuffer'
import { webglWorkerBridge }  from './workers/webglWorkerBridge'

export default function App() {
  const genWorkerRef  = useRef<Worker | null>(null)
  const isRunningRef  = useRef(false)
  const renderModeRef = useRef<'dom' | 'webgl'>('dom')
  const scenarioRef   = useRef<string>('bigdata')

  const setRunning = useBenchmarkStore((s) => s.setRunning)
  const nodeCount  = useBenchmarkStore((s) => s.nodeCount)

  // Синхронізуємо refs зі store (не хочемо closure-stale в onmessage)
  useEffect(() => {
    return useBenchmarkStore.subscribe((state) => {
      isRunningRef.current  = state.isRunning
      renderModeRef.current = state.renderMode
      scenarioRef.current   = state.scenario
    })
  }, [])

  // Дата-генератор Worker
  useEffect(() => {
    genWorkerRef.current = new Worker(
        new URL('./workers/dataGenerator.worker.ts', import.meta.url),
        { type: 'module' }
    )

    genWorkerRef.current.onmessage = (e: MessageEvent) => {
      if (e.data.type !== 'FRAME') return
      if (!isRunningRef.current) return

      // e.data.buf — Float32Array (бінарна копія від dataGenerator, ~0.5мс)
      const buf: Float32Array = e.data.buf
      const count: number     = e.data.count
      const scenario          = scenarioRef.current

      if (renderModeRef.current === 'webgl') {
        // Transfer до WebGL Worker: zero-copy (~0мс), головний потік більше не має buf
        webglWorkerBridge.update(buf, count, scenario)
      } else {
        // DOM режим: просто зберігаємо ref, DomRenderer прочитає в RAF
        dataBuffer.buf     = buf
        dataBuffer.count   = count
        dataBuffer.version++
      }
      // Ніяких setPoints, ніяких React ре-рендерів — лише ~0.5мс на routing
    }

    return () => { genWorkerRef.current?.terminate() }
  }, [])

  // Передаємо nodeCount у worker
  useEffect(() => {
    genWorkerRef.current?.postMessage({ type: 'SET_COUNT', payload: nodeCount })
  }, [nodeCount])

  const handleStart = () => {
    isRunningRef.current = true
    setRunning(true)
    genWorkerRef.current?.postMessage({ type: 'SET_COUNT', payload: nodeCount })
    genWorkerRef.current?.postMessage({ type: 'START' })
  }

  const handleStop = () => {
    isRunningRef.current = false
    setRunning(false)
    genWorkerRef.current?.postMessage({ type: 'STOP' })
    // Очищаємо обидва канали
    dataBuffer.buf   = null
    dataBuffer.count = 0
    dataBuffer.version++
    webglWorkerBridge.clear()
  }

  return (
      <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">
        <header className="bg-gray-900 border-b border-white/5 px-6 py-3 flex items-center gap-3 shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h1 className="text-sm font-semibold tracking-wide">
            Web Rendering Benchmarking Suite
          </h1>
          <span className="text-xs text-white/25 font-mono ml-2">
          Дослідження ефективності алгоритмів рендерингу вебконтенту · 2025
        </span>
        </header>

        <Controls onStart={handleStart} onStop={handleStop} />

        <main className="flex-1 relative min-h-0">
          <RenderPanel />
          <MetricsOverlay />
        </main>
      </div>
  )
}