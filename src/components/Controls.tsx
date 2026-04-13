import { useBenchmarkStore, type Scenario, type RenderMode } from '../store/benchmarkStore'
import { LagRadar } from './LagRadar'
import { InputLatencyTest } from './InputLatencyTest'

const SCENARIOS: { id: Scenario; label: string; desc: string }[] = [
    { id: 'bigdata',  label: 'A — Big Data',  desc: 'Scatter plot, 100–100k точок' },
    { id: 'reactive', label: 'B — Reactive',  desc: 'Bar chart, 60 Гц оновлення'  },
    { id: 'lod',      label: 'C — LOD',       desc: 'Адаптивна деталізація'        },
]

const NODE_PRESETS = [
    { label: 'N=100',  value: 100,    phase: 'Baseline'    },
    { label: 'N=5K',   value: 5_000,  phase: 'Degradation' },
    { label: 'N=50K',  value: 50_000, phase: 'Cliff'       },
]

export function Controls({
                             onStart,
                             onStop,
                         }: {
    onStart: () => void
    onStop:  () => void
}) {
    const nodeCount    = useBenchmarkStore((s) => s.nodeCount)
    const setNodeCount = useBenchmarkStore((s) => s.setNodeCount)
    const scenario     = useBenchmarkStore((s) => s.scenario)
    const setScenario  = useBenchmarkStore((s) => s.setScenario)
    const renderMode   = useBenchmarkStore((s) => s.renderMode)
    const setRenderMode = useBenchmarkStore((s) => s.setRenderMode)
    const isRunning    = useBenchmarkStore((s) => s.isRunning)

    return (
        <div className="bg-gray-900 border-b border-white/5 px-4 py-3 flex flex-wrap items-center gap-4 shrink-0">

            {/* ── Render mode switcher ── */}
            <div className="flex items-center rounded-lg overflow-hidden border border-white/10 shrink-0">
                {(['dom', 'webgl'] as RenderMode[]).map((mode) => {
                    const active = renderMode === mode
                    const label  = mode === 'dom' ? 'DOM / Canvas 2D' : 'WebGL / Three.js'
                    const accent = mode === 'dom' ? '#facc15' : '#4ade80'
                    return (
                        <button
                            key={mode}
                            onClick={() => setRenderMode(mode)}
                            className="px-4 py-2 text-xs font-semibold font-mono transition-all"
                            style={{
                                background: active ? `${accent}18` : 'transparent',
                                color:      active ? accent         : 'rgba(255,255,255,0.35)',
                                borderRight: mode === 'dom' ? '1px solid rgba(255,255,255,0.08)' : undefined,
                            }}
                        >
                            {mode === 'webgl' && (
                                <span className="mr-1.5 text-[9px] opacity-60">⬡</span>
                            )}
                            {label}
                        </button>
                    )
                })}
            </div>

            {/* ── Scenarios ── */}
            <div className="flex gap-1">
                {SCENARIOS.map((s) => (
                    <button
                        key={s.id}
                        onClick={() => setScenario(s.id)}
                        title={s.desc}
                        className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                            scenario === s.id
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70'
                        }`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {/* ── Node count ── */}
            <div className="flex items-center gap-2">
                {NODE_PRESETS.map((p) => (
                    <button
                        key={p.value}
                        onClick={() => setNodeCount(p.value)}
                        title={`Фаза: ${p.phase}`}
                        className={`px-2.5 py-1.5 rounded text-xs font-mono transition-colors ${
                            nodeCount === p.value
                                ? 'bg-violet-700 text-white'
                                : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70'
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
                    className="w-24 accent-violet-500"
                />
                <span className="text-xs font-mono text-white/30 w-16">
          {nodeCount.toLocaleString()}
        </span>
            </div>

            {/* ── Start / Stop ── */}
            <button
                onClick={isRunning ? onStop : onStart}
                className={`px-4 py-1.5 rounded text-sm font-semibold transition-colors shrink-0 ${
                    isRunning
                        ? 'bg-red-700 hover:bg-red-600 text-white'
                        : 'bg-emerald-700 hover:bg-emerald-600 text-white'
                }`}
            >
                {isRunning ? '⏹ Стоп' : '▶ Старт'}
            </button>

            {/* ── Right side tools ── */}
            <div className="ml-auto flex items-center gap-5 shrink-0">
                <InputLatencyTest />
                <LagRadar />
            </div>
        </div>
    )
}