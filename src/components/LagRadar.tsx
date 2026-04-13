import { useEffect, useRef } from 'react'

// requestAnimationFrame перестає викликатись, коли головний потік заблоковано.
// Ця анімація є живим індикатором: якщо крутиться — потік вільний.
export function LagRadar() {
    const dotRef = useRef<HTMLDivElement>(null)
    const angleRef = useRef(0)
    const rafRef = useRef<number>(0)

    useEffect(() => {
        const animate = () => {
            angleRef.current = (angleRef.current + 3) % 360
            if (dotRef.current) {
                const rad = (angleRef.current * Math.PI) / 180
                const x = Math.cos(rad) * 18
                const y = Math.sin(rad) * 18
                dotRef.current.style.transform = `translate(${x}px, ${y}px)`
            }
            rafRef.current = requestAnimationFrame(animate)
        }
        rafRef.current = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(rafRef.current)
    }, [])

    return (
        <div className="flex flex-col items-center gap-1">
            <div className="text-xs font-mono text-white/40">Lag Radar</div>
            <div className="relative w-12 h-12 rounded-full border border-white/10 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute" ref={dotRef} />
            </div>
        </div>
    )
}