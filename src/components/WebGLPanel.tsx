import { useEffect, useRef, useState } from 'react'
import { useBenchmarkStore } from '../store/benchmarkStore'

export function WebGLPanel() {
    const containerRef = useRef<HTMLDivElement>(null)
    const workerRef    = useRef<Worker | null>(null)
    const canvasRef    = useRef<HTMLCanvasElement | null>(null)

    // Локальні метрики — приходять з Worker через postMessage
    const [fps, setFps]           = useState(0)
    const [frameTime, setFrameTime] = useState(0)

    const setWebglFps    = useBenchmarkStore((s) => s.setWebglFps)
    const setWebglMemory = useBenchmarkStore((s) => s.setWebglMemory)

    // --- Ініціалізація Worker + OffscreenCanvas ---
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        // Перевіряємо підтримку OffscreenCanvas
        if (!('OffscreenCanvas' in window)) {
            console.error('OffscreenCanvas не підтримується цим браузером')
            return
        }

        // Створюємо canvas та одразу передаємо контроль Worker-у
        const canvas = document.createElement('canvas')
        canvas.style.cssText = 'display:block;position:absolute;top:0;left:0;width:100%;height:100%;'
        container.appendChild(canvas)
        canvasRef.current = canvas

        // Запускаємо WebGL Worker
        const worker = new Worker(
            new URL('../workers/webgl.worker.ts', import.meta.url),
            { type: 'module' }
        )
        workerRef.current = worker

        // Worker повертає метрики — зберігаємо в store і локальний state
        worker.onmessage = (e: MessageEvent) => {
            if (e.data.type === 'METRICS') {
                const { fps: f, frameTime: ft } = e.data
                setFps(f)
                setFrameTime(ft)
                setWebglFps(f)
                // Memory в Worker не вимірюємо (немає доступу до performance.memory)
                setWebglMemory(0)
            }
        }

        // ResizeObserver — стежить за реальними розмірами контейнера
        const observer = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect
            if (width === 0 || height === 0) return

            // Встановлюємо фізичні розміри canvas (атрибути, не CSS)
            canvas.width  = Math.round(width  * window.devicePixelRatio)
            canvas.height = Math.round(height * window.devicePixelRatio)

            if (!worker) return

            // Якщо Worker ще не ініціалізований — передаємо OffscreenCanvas
            // transferControlToOffscreen() можна викликати лише ОДИН раз
            if (!(canvas as any).__transferred) {
                const offscreen = canvas.transferControlToOffscreen()
                ;(canvas as any).__transferred = true
                worker.postMessage(
                    { type: 'INIT', payload: { canvas: offscreen, width: canvas.width, height: canvas.height } },
                    [offscreen] // Transferable — передаємо право власності Worker-у
                )
            } else {
                // Наступні ресайзи — просто повідомляємо Worker
                worker.postMessage({
                    type: 'RESIZE',
                    payload: { width: canvas.width, height: canvas.height },
                })
            }
        })

        observer.observe(container)

        return () => {
            observer.disconnect()
            worker.terminate()
            canvas.remove()
            workerRef.current = null
            canvasRef.current = null
        }
    }, [setWebglFps, setWebglMemory])

    // --- Пробрасуємо нові дані зі store у Worker ---
    useEffect(() => {
        return useBenchmarkStore.subscribe((state) => {
            const worker = workerRef.current
            if (!worker) return

            const { points, scenario } = state

            if (!points || points.length === 0) {
                worker.postMessage({ type: 'CLEAR' })
                return
            }

            worker.postMessage({
                type: 'UPDATE',
                payload: { points, scenario },
            })
        })
    }, [])

    // Колір FPS індикатора
    const fpsColor = fps >= 55 ? '#4ade80' : fps >= 30 ? '#facc15' : '#f87171'
    const ftColor  = frameTime <= 18 ? '#4ade80' : frameTime <= 34 ? '#facc15' : '#f87171'

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full"
            style={{ minHeight: 0 }}
        >
            {/* Мітка + метрики — поверх canvas */}
            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 pointer-events-none">
        <span className="text-xs text-green-400 font-mono bg-black/70 px-2 py-1 rounded">
          WebGL / Three.js · <span style={{ color: fpsColor }}>{fps} FPS</span>
        </span>
                <span className="text-xs font-mono bg-black/70 px-2 py-1 rounded" style={{ color: ftColor }}>
          Frame: {frameTime} ms
        </span>
                <span className="text-xs text-emerald-300 font-mono bg-black/70 px-1.5 py-0.5 rounded text-[10px]">
          OffscreenCanvas · Worker
        </span>
            </div>
        </div>
    )
}