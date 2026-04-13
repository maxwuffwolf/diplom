import { useCallback, useRef, useEffect } from 'react'
import { useBenchmarkStore } from '../store/benchmarkStore'
import { useFrameMetrics } from '../hooks/useFrameMetrics'
import type { DataPoint } from '../workers/dataGenerator.worker'

// Поріг: при N > DOM_THRESHOLD переключаємось на Canvas 2D замість DOM-елементів
// Це дозволяє показати деградацію при N=5K (лагає), але не вбиває вкладку
const DOM_THRESHOLD = 2000

// Колір на основі value (0=синій → 1=червоний), повертає rgb-рядок
function valueToColor(v: number): string {
    const r = Math.round(v * 230)
    const b = Math.round((1 - v) * 230)
    return `rgb(${r},89,${b})`
}

// --- Canvas 2D рендерер (для великої кількості точок) ---
function Canvas2DScatter({ points }: { points: DataPoint[] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const rafRef = useRef<number>(0)

    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        const observer = new ResizeObserver(() => {
            canvas.width = container.offsetWidth
            canvas.height = container.offsetHeight
        })
        observer.observe(container)
        canvas.width = container.offsetWidth
        canvas.height = container.offsetHeight

        return () => {
            observer.disconnect()
            cancelAnimationFrame(rafRef.current)
        }
    }, [])

    // Перемальовуємо при зміні points
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => {
            const ctx = canvas.getContext('2d')
            if (!ctx) return

            ctx.clearRect(0, 0, canvas.width, canvas.height)

            for (const p of points) {
                const x = p.x * canvas.width
                const y = p.y * canvas.height
                const r = 3

                ctx.beginPath()
                ctx.arc(x, y, r, 0, Math.PI * 2)
                ctx.fillStyle = valueToColor(p.value)
                ctx.fill()
            }
        })
    }, [points])

    return (
        <div ref={containerRef} className="w-full h-full">
            <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
        </div>
    )
}

// --- DOM scatter (для малої кількості точок — навмисно "важкий") ---
function DomScatterDot({ point }: { point: DataPoint }) {
    return (
        <div
            style={{
                position: 'absolute',
                left: `${point.x * 100}%`,
                top: `${point.y * 100}%`,
                width: point.active ? 12 : 7,
                height: point.active ? 12 : 7,
                borderRadius: '50%',
                backgroundColor: valueToColor(point.value),
                transform: 'translate(-50%, -50%)',
                willChange: 'background-color',
            }}
        />
    )
}

// --- Bar chart (сценарій Reactive) ---
function BarChart({ points }: { points: DataPoint[] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const rafRef = useRef<number>(0)

    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        canvas.width = container.offsetWidth
        canvas.height = container.offsetHeight

        const observer = new ResizeObserver(() => {
            canvas.width = container.offsetWidth
            canvas.height = container.offsetHeight
        })
        observer.observe(container)
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || points.length === 0) return

        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(() => {
            const ctx = canvas.getContext('2d')
            if (!ctx) return

            ctx.clearRect(0, 0, canvas.width, canvas.height)
            const bars = points.slice(0, 300)
            const barW = canvas.width / bars.length

            bars.forEach((p, i) => {
                const h = p.value * canvas.height * 0.9
                ctx.fillStyle = valueToColor(p.value)
                ctx.fillRect(i * barW, canvas.height - h, barW - 1, h)
            })
        })
    }, [points])

    return (
        <div ref={containerRef} className="w-full h-full">
            <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
        </div>
    )
}

// --- Головний компонент панелі ---
export function DomPanel() {
    const points = useBenchmarkStore((s) => s.points)
    const scenario = useBenchmarkStore((s) => s.scenario)
    const nodeCount = useBenchmarkStore((s) => s.nodeCount)
    const setDomFps = useBenchmarkStore((s) => s.setDomFps)
    const setDomMemory = useBenchmarkStore((s) => s.setDomMemory)

    const onMetrics = useCallback(
        (m: { fps: number; memoryMB: number }) => {
            setDomFps(m.fps)
            setDomMemory(m.memoryMB)
        },
        [setDomFps, setDomMemory]
    )

    useFrameMetrics(onMetrics)

    // Вибираємо що рендерити залежно від сценарію і кількості точок
    const renderContent = () => {
        if (scenario === 'reactive') {
            // Завжди Canvas 2D для bar chart (реактивне оновлення)
            return <BarChart points={points} />
        }

        if (nodeCount <= DOM_THRESHOLD) {
            // СПРАВЖНІЙ DOM — навмисно "важкий" спосіб для N=100..2000
            // Мета: показати деградацію при збільшенні N
            return (
                <div className="relative w-full h-full">
                    {points.map((p) => (
                        <DomScatterDot key={p.id} point={p} />
                    ))}
                </div>
            )
        }

        // При N > 2000 DOM-панель теж переходить на Canvas 2D —
        // але значно повільніший варіант (без WebGL оптимізацій),
        // щоб контраст з правою панеллю залишався помітним
        return <Canvas2DScatter points={points} />
    }

    // Мітка режиму для підпису в дипломній роботі
    const modeLabel = scenario === 'reactive'
        ? 'DOM · Canvas 2D bar chart'
        : nodeCount <= DOM_THRESHOLD
            ? `DOM · ${points.length} елементів`
            : `DOM → Canvas 2D (N > ${DOM_THRESHOLD})`

    return (
        <div className="relative w-full h-full bg-gray-950 overflow-hidden">
            <div className="absolute top-2 left-2 z-10 text-xs text-yellow-400 font-mono bg-black/60 px-2 py-1 rounded pointer-events-none">
                {modeLabel}
            </div>
            {renderContent()}
        </div>
    )
}