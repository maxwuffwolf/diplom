import { useEffect, useRef } from 'react'
import { DomPanel } from './components/DomPanel'
import { WebGLPanel } from './components/WebGLPanel'
import { MetricsOverlay } from './components/MetricsOverlay'
import { Controls } from './components/Controls'
import { useBenchmarkStore } from './store/benchmarkStore'
import type { DataPoint } from './workers/dataGenerator.worker'

export default function App() {
  const workerRef    = useRef<Worker | null>(null)
  const isRunningRef = useRef(false)

  const setPoints  = useBenchmarkStore((s) => s.setPoints)
  const setRunning = useBenchmarkStore((s) => s.setRunning)
  const nodeCount  = useBenchmarkStore((s) => s.nodeCount)

  // Синхронізуємо isRunning ref зі store
  useEffect(() => {
    return useBenchmarkStore.subscribe((state) => {
      isRunningRef.current = state.isRunning
    })
  }, [])

  // Data generator Worker (головний потік отримує дані і роздає панелям)
  useEffect(() => {
    workerRef.current = new Worker(
        new URL('./workers/dataGenerator.worker.ts', import.meta.url),
        { type: 'module' }
    )

    workerRef.current.onmessage = (e: MessageEvent) => {
      if (e.data.type !== 'FRAME') return
      if (!isRunningRef.current) return

      const points = e.data.payload as DataPoint[]

      // Оновлюємо store — звідси:
      // 1. DomPanel підписується через useBenchmarkStore (головний потік)
      // 2. WebGLPanel підписується через useBenchmarkStore.subscribe і
      //    пробрасує дані у свій Worker через postMessage
      setPoints(points)
    }

    return () => {
      workerRef.current?.terminate()
    }
  }, [setPoints])

  useEffect(() => {
    workerRef.current?.postMessage({ type: 'SET_COUNT', payload: nodeCount })
  }, [nodeCount])

  const handleStart = () => {
    isRunningRef.current = true
    setRunning(true)
    workerRef.current?.postMessage({ type: 'SET_COUNT', payload: nodeCount })
    workerRef.current?.postMessage({ type: 'START' })
  }

  const handleStop = () => {
    isRunningRef.current = false
    setRunning(false)
    workerRef.current?.postMessage({ type: 'STOP' })
    setPoints([])
  }

  return (
      <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">
        <header className="bg-gray-900 border-b border-white/5 px-6 py-3 flex items-center gap-3 shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h1 className="text-sm font-semibold tracking-wide">
            Web Rendering Benchmarking Suite
          </h1>
          <span className="text-xs text-white/30 font-mono ml-2">
          DOM vs WebGL · Дипломна робота 2025
        </span>
        </header>

        <Controls onStart={handleStart} onStop={handleStop} />

        <main className="flex flex-1 overflow-hidden relative min-h-0">
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10 z-10 pointer-events-none" />
          <div className="w-1/2 h-full">
            <DomPanel />
          </div>
          <div className="w-1/2 h-full">
            <WebGLPanel />
          </div>
          <MetricsOverlay />
        </main>
      </div>
  )
}