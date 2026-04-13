import { useRef, useState } from 'react'

export function InputLatencyTest() {
    const [value, setValue]   = useState('')
    const [latency, setLatency] = useState<number | null>(null)
    const tsRef = useRef<number>(0)

    const color = latency === null ? 'text-white/30'
        : latency < 50  ? 'text-green-400'
            : latency < 150 ? 'text-yellow-400'
                : 'text-red-400'

    return (
        <div className="flex items-center gap-2">
            <input
                value={value}
                onKeyDown={() => { tsRef.current = performance.now() }}
                onChange={(e) => {
                    setLatency(Math.round(performance.now() - tsRef.current))
                    setValue(e.target.value)
                }}
                placeholder="Набирай…"
                className="bg-white/5 border border-white/10 rounded px-2.5 py-1 text-xs text-white placeholder-white/20 w-28 focus:outline-none focus:border-white/30"
            />
            <span className={`text-xs font-mono w-14 ${color}`}>
        {latency !== null ? `${latency} ms` : '— ms'}
      </span>
        </div>
    )
}