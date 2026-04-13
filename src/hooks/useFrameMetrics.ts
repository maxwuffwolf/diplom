import { useEffect, useRef, useCallback } from 'react'

interface FrameMetrics {
    fps:       number
    frameTime: number
    memoryMB:  number
}

export function useFrameMetrics(onMetrics: (m: FrameMetrics) => void) {
    const frameCountRef = useRef(0)
    const lastTimeRef   = useRef(performance.now())
    const rafRef        = useRef<number>(0)

    const tick = useCallback(() => {
        frameCountRef.current++
        const now     = performance.now()
        const elapsed = now - lastTimeRef.current

        if (elapsed >= 500) {
            const fps       = Math.round((frameCountRef.current / elapsed) * 1000)
            const frameTime = parseFloat((elapsed / frameCountRef.current).toFixed(1))
            const mem       = (performance as any).memory
            const memoryMB  = mem ? Math.round(mem.usedJSHeapSize / 1_048_576) : 0
            onMetrics({ fps, frameTime, memoryMB })
            frameCountRef.current = 0
            lastTimeRef.current   = now
        }
        rafRef.current = requestAnimationFrame(tick)
    }, [onMetrics])

    useEffect(() => {
        rafRef.current = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(rafRef.current)
    }, [tick])
}