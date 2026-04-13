// RenderPanel.tsx
// DomRenderer: власний RAF-цикл, читає dataBuffer (не Zustand).
//              Показує реальне навантаження на головний потік.
// WebGLRenderer: OffscreenCanvas + Worker. Реєструється у webglWorkerBridge.
//                App.tsx надсилає дані напряму через bridge (минаючи React).

import { useEffect, useRef, useCallback } from 'react'
import { useBenchmarkStore }  from '../store/benchmarkStore'
import { useFrameMetrics }    from '../hooks/useFrameMetrics'
import { dataBuffer }         from '../store/dataBuffer'
import { webglWorkerBridge }  from '../workers/webglWorkerBridge'

// ─── helpers ─────────────────────────────────────────────────────────────────

function valueToColor(v: number) {
    return `rgb(${Math.round(v * 230)},89,${Math.round((1 - v) * 230)})`
}

// Малюємо безпосередньо з Float32Array — без проміжних об'єктів
function drawFromBuffer(
    ctx:      CanvasRenderingContext2D,
    w:        number,
    h:        number,
    buf:      Float32Array,
    count:    number,
    scenario: string,
) {
    ctx.clearRect(0, 0, w, h)
    if (count === 0) return

    if (scenario === 'reactive') {
        // Bar chart — відображаємо до 500 стовпців
        const n    = Math.min(count, 500)
        const barW = w / n
        for (let i = 0; i < n; i++) {
            const v = buf[i * 4 + 2]
            const barH = v * h * 0.92
            ctx.fillStyle = valueToColor(v)
            ctx.fillRect(i * barW, h - barH, Math.max(1, barW - 1), barH)
        }
    } else {
        // Scatter / LOD
        for (let i = 0; i < count; i++) {
            const i4     = i * 4
            const x      = buf[i4]     * w
            const y      = buf[i4 + 1] * h
            const v      = buf[i4 + 2]
            const active = buf[i4 + 3] > 0.5
            const r      = (scenario === 'lod' && active) ? 6 : 3
            ctx.beginPath()
            ctx.arc(x, y, r, 0, Math.PI * 2)
            ctx.fillStyle = valueToColor(v)
            ctx.fill()
        }
    }
}

// ─── DOM / Canvas 2D renderer ─────────────────────────────────────────────────

function DomRenderer() {
    const canvasRef    = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const rafRef       = useRef<number>(0)
    const lastVerRef   = useRef(-1)    // остання оброблена версія dataBuffer
    const setMetrics   = useBenchmarkStore((s) => s.setMetrics)

    // Синхронізуємо розмір canvas з контейнером
    useEffect(() => {
        const container = containerRef.current
        const canvas    = canvasRef.current
        if (!container || !canvas) return
        const sync = () => {
            canvas.width  = container.offsetWidth
            canvas.height = container.offsetHeight
        }
        sync()
        const ro = new ResizeObserver(sync)
        ro.observe(container)
        return () => ro.disconnect()
    }, [])

    // FPS через RAF головного потоку — показує РЕАЛЬНЕ навантаження на нього
    const onMetrics = useCallback(
        (m: { fps: number; frameTime: number; memoryMB: number }) => {
            setMetrics(m.fps, m.frameTime, m.memoryMB)
        },
        [setMetrics]
    )
    useFrameMetrics(onMetrics)

    // Власний RAF-цикл малювання — читає dataBuffer, не Zustand
    useEffect(() => {
        const draw = () => {
            rafRef.current = requestAnimationFrame(draw)

            const canvas = canvasRef.current
            if (!canvas) return
            if (!dataBuffer.buf || dataBuffer.count === 0) {
                // Нічого немає — очищаємо і виходимо
                if (lastVerRef.current !== dataBuffer.version) {
                    lastVerRef.current = dataBuffer.version
                    const ctx = canvas.getContext('2d')
                    ctx?.clearRect(0, 0, canvas.width, canvas.height)
                }
                return
            }

            // Малюємо тільки якщо з'явились нові дані (нова version)
            if (lastVerRef.current === dataBuffer.version) return
            lastVerRef.current = dataBuffer.version

            const ctx = canvas.getContext('2d')
            if (!ctx) return

            // Читаємо scenario без підписки — direct getState(), не тригерить ре-рендер
            const scenario = useBenchmarkStore.getState().scenario

            drawFromBuffer(ctx, canvas.width, canvas.height, dataBuffer.buf, dataBuffer.count, scenario)
        }

        rafRef.current = requestAnimationFrame(draw)
        return () => cancelAnimationFrame(rafRef.current)
    }, [])

    return (
        <div ref={containerRef} className="w-full h-full">
            <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
        </div>
    )
}

// ─── WebGL (OffscreenCanvas + Worker) ────────────────────────────────────────

function WebGLRenderer() {
    const containerRef = useRef<HTMLDivElement>(null)
    const setMetrics   = useBenchmarkStore((s) => s.setMetrics)

    useEffect(() => {
        const container = containerRef.current
        if (!container || !('OffscreenCanvas' in window)) return

        const canvas = document.createElement('canvas')
        canvas.style.cssText = 'display:block;position:absolute;top:0;left:0;width:100%;height:100%;'
        container.appendChild(canvas)

        const worker = new Worker(
            new URL('../workers/webgl.worker.ts', import.meta.url),
            { type: 'module' }
        )

        // Реєструємо в bridge — тепер App.tsx може надсилати дані напряму
        webglWorkerBridge.register(worker)

        // Метрики повертаються з Worker назад на головний потік (раз на 500мс — не навантажує)
        worker.onmessage = (e: MessageEvent) => {
            if (e.data.type === 'METRICS') {
                setMetrics(e.data.fps, e.data.frameTime, 0)
            }
        }

        const ro = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect
            if (width === 0 || height === 0) return

            const dpr = window.devicePixelRatio
            canvas.width  = Math.round(width  * dpr)
            canvas.height = Math.round(height * dpr)

            if (!(canvas as any).__transferred) {
                const offscreen = canvas.transferControlToOffscreen()
                ;(canvas as any).__transferred = true
                worker.postMessage(
                    { type: 'INIT', payload: { canvas: offscreen, width: canvas.width, height: canvas.height } },
                    [offscreen]
                )
            } else {
                worker.postMessage({ type: 'RESIZE', payload: { width: canvas.width, height: canvas.height } })
            }
        })
        ro.observe(container)

        return () => {
            ro.disconnect()
            webglWorkerBridge.register(null)  // розреєструємо
            worker.terminate()
            canvas.remove()
        }
    }, [setMetrics])

    return (
        <div ref={containerRef} className="w-full h-full relative" style={{ minHeight: 0 }} />
    )
}

// ─── RenderPanel ─────────────────────────────────────────────────────────────

export function RenderPanel() {
    const renderMode = useBenchmarkStore((s) => s.renderMode)

    return (
        <div className="w-full h-full relative bg-gray-950 overflow-hidden">
            {/* Обидва завжди змонтовані — WebGL Worker не перезапускається при перемиканні.
          visibility:hidden = не рендерить пікселі, але DOM вузол і Worker живі. */}
            <div
                className="absolute inset-0"
                style={{ visibility: renderMode === 'dom' ? 'visible' : 'hidden' }}
            >
                <DomRenderer />
            </div>
            <div
                className="absolute inset-0"
                style={{ visibility: renderMode === 'webgl' ? 'visible' : 'hidden' }}
            >
                <WebGLRenderer />
            </div>
        </div>
    )
}