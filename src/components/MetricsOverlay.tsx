import { useBenchmarkStore } from '../store/benchmarkStore'

export function MetricsOverlay() {
    const fps        = useBenchmarkStore((s) => s.fps)
    const frameTime  = useBenchmarkStore((s) => s.frameTime)
    const memoryMB   = useBenchmarkStore((s) => s.memoryMB)
    const nodeCount  = useBenchmarkStore((s) => s.nodeCount)
    const renderMode = useBenchmarkStore((s) => s.renderMode)

    const fpsColor = fps >= 55 ? '#4ade80' : fps >= 30 ? '#facc15' : '#f87171'
    const ftColor  = frameTime <= 18 ? '#4ade80' : frameTime <= 34 ? '#facc15' : '#f87171'
    const pct      = Math.min(100, (fps / 60) * 100)

    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-black/80 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-4 w-80 flex flex-col gap-3 pointer-events-none">

            {/* Режим + N */}
            <div className="flex items-center justify-between">
        <span
            className="text-xs font-mono px-2 py-0.5 rounded-full font-semibold"
            style={{
                background: renderMode === 'webgl' ? 'rgba(74,222,128,0.15)' : 'rgba(250,204,21,0.15)',
                color:      renderMode === 'webgl' ? '#4ade80' : '#facc15',
                border:     `1px solid ${renderMode === 'webgl' ? 'rgba(74,222,128,0.3)' : 'rgba(250,204,21,0.3)'}`,
            }}
        >
          {renderMode === 'webgl' ? 'WebGL · OffscreenCanvas' : 'DOM · Canvas 2D'}
        </span>
                <span className="text-xs text-white/40 font-mono">
          N = {nodeCount.toLocaleString()}
        </span>
            </div>

            {/* FPS bar */}
            <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline">
                    <span className="text-xs text-white/50 font-mono">FPS</span>
                    <span className="text-lg font-mono font-semibold" style={{ color: fpsColor }}>
            {fps}
          </span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%`, background: fpsColor }}
                    />
                </div>
                <div className="text-xs text-white/30 font-mono text-right">
                    target: 60 FPS / 16.6 ms
                </div>
            </div>

            {/* Frame time + Memory */}
            <div className="flex justify-between text-xs font-mono">
        <span>
          Frame: <span style={{ color: ftColor }}>{frameTime} ms</span>
        </span>
                {memoryMB > 0 && (
                    <span className="text-white/40">
            Heap: {memoryMB} MB
          </span>
                )}
            </div>

        </div>
    )
}