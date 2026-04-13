import { create } from 'zustand'
import type { DataPoint } from '../workers/dataGenerator.worker'

export type Scenario = 'bigdata' | 'reactive' | 'lod'

interface BenchmarkState {
    // Дані від Worker
    points: DataPoint[]
    setPoints: (points: DataPoint[]) => void

    // Параметри експерименту
    nodeCount: number
    setNodeCount: (n: number) => void

    scenario: Scenario
    setScenario: (s: Scenario) => void

    isRunning: boolean
    setRunning: (v: boolean) => void

    // Метрики (заповнюються кожною панеллю окремо)
    domFps: number
    setDomFps: (v: number) => void

    webglFps: number
    setWebglFps: (v: number) => void

    domMemory: number
    setDomMemory: (v: number) => void

    webglMemory: number
    setWebglMemory: (v: number) => void
}

export const useBenchmarkStore = create<BenchmarkState>((set) => ({
    points: [],
    setPoints: (points) => set({ points }),

    nodeCount: 100,
    setNodeCount: (nodeCount) => set({ nodeCount }),

    scenario: 'bigdata',
    setScenario: (scenario) => set({ scenario }),

    isRunning: false,
    setRunning: (isRunning) => set({ isRunning }),

    domFps: 0,
    setDomFps: (domFps) => set({ domFps }),

    webglFps: 0,
    setWebglFps: (webglFps) => set({ webglFps }),

    domMemory: 0,
    setDomMemory: (domMemory) => set({ domMemory }),

    webglMemory: 0,
    setWebglMemory: (webglMemory) => set({ webglMemory }),
}))