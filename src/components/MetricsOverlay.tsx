import { useBenchmarkStore } from '../store/benchmarkStore'

function FpsBar({ fps, label, color }: { fps: number; label: string; color: string }) {
    const pct = Math.min(100, (fps / 60) * 100)
    const statusColor = fps >= 55 ? '#4ade80' : fps >= 30 ? '#facc15' : '#f87171'

    return (
        <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs font-mono">
                <span style={{ color }}>{label}</span>
                <span style={{ color: statusColor }}>{fps} FPS</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, backgroundColor: statusColor }}
                />
            </div>
        </div>
    )
}

export function MetricsOverlay() {
    const domFps = useBenchmarkStore((s) => s.domFps)
    const webglFps = useBenchmarkStore((s) => s.webglFps)
    const domMemory = useBenchmarkStore((s) => s.domMemory)
    const webglMemory = useBenchmarkStore((s) => s.webglMemory)
    const nodeCount = useBenchmarkStore((s) => s.nodeCount)

    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-black/80 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 w-72 flex flex-col gap-3">
            <div className="text-xs text-white/50 font-mono text-center">
                N = {nodeCount.toLocaleString()} nodes
            </div>
            <FpsBar fps={domFps} label="DOM" color="#facc15" />
            <FpsBar fps={webglFps} label="WebGL" color="#4ade80" />
            <div className="flex justify-between text-xs font-mono text-white/40">
                <span>Heap: {domMemory} MB</span>
                <span>Heap: {webglMemory} MB</span>
            </div>
        </div>
    )
}