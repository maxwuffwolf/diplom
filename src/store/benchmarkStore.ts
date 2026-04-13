// benchmarkStore.ts
// points ВИДАЛЕНО зі store — більше не проходить через Zustand/React.
// Дані тепер течуть через dataBuffer (DOM) або webglWorkerBridge (WebGL).

import { create } from 'zustand'

export type Scenario   = 'bigdata' | 'reactive' | 'lod'
export type RenderMode = 'dom' | 'webgl'

interface BenchmarkState {
    nodeCount:    number
    setNodeCount: (n: number) => void

    scenario:    Scenario
    setScenario: (s: Scenario) => void

    renderMode:    RenderMode
    setRenderMode: (m: RenderMode) => void

    isRunning:  boolean
    setRunning: (v: boolean) => void

    fps:        number
    frameTime:  number
    memoryMB:   number
    setMetrics: (fps: number, frameTime: number, memoryMB: number) => void
}

export const useBenchmarkStore = create<BenchmarkState>((set) => ({
    nodeCount:    100,
    setNodeCount: (nodeCount)  => set({ nodeCount }),

    scenario:    'bigdata',
    setScenario: (scenario)    => set({ scenario }),

    renderMode:    'dom',
    setRenderMode: (renderMode) => set({ renderMode }),

    isRunning:  false,
    setRunning: (isRunning)    => set({ isRunning }),

    fps:       0,
    frameTime: 0,
    memoryMB:  0,
    setMetrics: (fps, frameTime, memoryMB) => set({ fps, frameTime, memoryMB }),
}))