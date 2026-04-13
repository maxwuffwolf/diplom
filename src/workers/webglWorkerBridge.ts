// webglWorkerBridge.ts
// Модуль-синглтон: дозволяє App.tsx надсилати дані у WebGL Worker
// без prop drilling та без Zustand (не тригерить React ре-рендери).

let _worker: Worker | null = null

export const webglWorkerBridge = {
    /** WebGLRenderer викликає це після створення Worker */
    register(w: Worker | null) {
        _worker = w
    },

    /** App.tsx викликає це коли отримує новий кадр і активний WebGL режим */
    update(buf: Float32Array, count: number, scenario: string) {
        if (!_worker) return
        // Transfer буфера: zero-copy, ~0мс. Головний потік більше не потребує буфера.
        _worker.postMessage(
            { type: 'UPDATE', payload: { buf, count, scenario } },
            [buf.buffer]
        )
    },

    clear() {
        _worker?.postMessage({ type: 'CLEAR' })
    },
}