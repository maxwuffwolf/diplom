import { useRef, useState } from 'react'

export function InputLatencyTest() {
    const [value, setValue] = useState('')
    const [latency, setLatency] = useState<number | null>(null)
    const tsRef = useRef<number>(0)

    const handleKeyDown = () => {
        tsRef.current = performance.now()
    }

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const now = performance.now()
        const delta = now - tsRef.current
        setLatency(Math.round(delta))
        setValue(e.target.value)
    }

    const color = latency === null ? 'text-white/40'
        : latency < 50 ? 'text-green-400'
            : latency < 100 ? 'text-yellow-400'
                : 'text-red-400'

    return (
        <div className="flex items-center gap-3">
            <input
                value={value}
                onKeyDown={handleKeyDown}
                onChange={handleInput}
                placeholder="Набирай текст..."
                className="bg-white/5 border border-white/10 rounded px-3 py-1.5 text-sm text-white placeholder-white/20 w-40 focus:outline-none focus:border-white/30"
            />
            <span className={`text-xs font-mono ${color}`}>
        {latency !== null ? `${latency} ms` : '— ms'}
      </span>
        </div>
    )
}