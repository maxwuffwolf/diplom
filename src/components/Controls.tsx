import { useBenchmarkStore, type Scenario } from '../store/benchmarkStore'
import { LagRadar } from './LagRadar'
import { InputLatencyTest } from './InputLatencyTest'

const SCENARIOS: { id: Scenario; label: string; desc: string }[] = [
    { id: 'bigdata', label: 'A — Big Data', desc: 'Scatter plot, 100–100k точок' },
    { id: 'reactive', label: 'B — Reactive', desc: 'Bar chart 60 Гц оновлення' },
    { id: 'lod', label: 'C — LOD', desc: 'Адаптивна деталізація' },
]

// Попередньо визначені кількості вузлів (три фази з диплому)
const NODE_PRESETS = [
    { label: 'N=100', value: 100, phase: 'Baseline' },
    { label: 'N=5K', value: 5_000, phase: 'Degradation' },
    { label: 'N=50K', value: 50_000, phase: 'Cliff' },
]

export function Controls({ onStart, onStop }: { onStart: () => void; onStop: () => void }) {
    const nodeCount = useBenchmarkStore((s) => s.nodeCount)
    const setNodeCount = useBenchmarkStore((s) => s.setNodeCount)
    const scenario = useBenchmarkStore((s) => s.scenario)
    const setScenario = useBenchmarkStore((s) => s.setScenario)
    const isRunning = useBenchmarkStore((s) => s.isRunning)

    return (
        <div className="bg-gray-900 border-b border-white/5 px-4 py-3 flex items-center gap-6 flex-wrap">
            {/* Сценарій */}
            <div className="flex gap-1">
                {SCENARIOS.map((s) => (
                    <button
                        key={s.id}
                        onClick={() => setScenario(s.id)}
                        title={s.desc}
                        className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                            scenario === s.id
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white/5 text-white/50 hover:bg-white/10'
                        }`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {/* Кількість вузлів */}
            <div className="flex items-center gap-2">
                {NODE_PRESETS.map((p) => (
                    <button
                        key={p.value}
                        onClick={() => setNodeCount(p.value)}
                        title={`Фаза: ${p.phase}`}
                        className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                            nodeCount === p.value
                                ? 'bg-violet-700 text-white'
                                : 'bg-white/5 text-white/50 hover:bg-white/10'
                        }`}
                    >
                        {p.label}
                    </button>
                ))}
                <input
                    type="range"
                    min={10}
                    max={100_000}
                    step={100}
                    value={nodeCount}
                    onChange={(e) => setNodeCount(Number(e.target.value))}
                    className="w-28 accent-violet-500"
                />
                <span className="text-xs font-mono text-white/40 w-14">
          {nodeCount.toLocaleString()}
        </span>
            </div>

            {/* Старт/Стоп */}
            <button
                onClick={isRunning ? onStop : onStart}
                className={`px-4 py-1.5 rounded text-sm font-semibold transition-colors ${
                    isRunning
                        ? 'bg-red-700 hover:bg-red-600 text-white'
                        : 'bg-emerald-700 hover:bg-emerald-600 text-white'
                }`}
            >
                {isRunning ? '⏹ Стоп' : '▶ Старт'}
            </button>

            <div className="ml-auto flex items-center gap-6">
                <InputLatencyTest />
                <LagRadar />
            </div>
        </div>
    )
}