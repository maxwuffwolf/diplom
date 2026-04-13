import { useEffect, useRef } from 'react'

export function LagRadar() {
    const dotRef = useRef<HTMLDivElement>(null)
    const rafRef = useRef<number>(0)
    const angleRef = useRef(0)

    useEffect(() => {
        const animate = () => {
            angleRef.current = (angleRef.current + 3) % 360
            if (dotRef.current) {
                const rad = (angleRef.current * Math.PI) / 180
                dotRef.current.style.transform = `translate(${Math.cos(rad) * 16}px, ${Math.sin(rad) * 16}px)`
            }
            rafRef.current = requestAnimationFrame(animate)
        }
        rafRef.current = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(rafRef.current)
    }, [])

    return (
        <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-mono text-white/30">Lag Radar</span>
            <div className="relative w-10 h-10 rounded-full border border-white/10 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute" ref={dotRef} />
            </div>
        </div>
    )
}