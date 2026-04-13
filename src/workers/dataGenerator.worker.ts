// dataGenerator.worker.ts
// КЛЮЧОВА ЗМІНА: виводить Float32Array замість масиву DataPoint-об'єктів.
//
// Старий підхід: postMessage([{id,x,y,value,active}, ...])
//   → Structured Clone серіалізує 50K об'єктів → ~25-35мс на головному потоці
//
// Новий підхід: postMessage({ buf: Float32Array })
//   → ArrayBuffer копіюється як блок пам'яті (~0.5мс для 800KB) → ~50x швидше

// Формат буфера: 4 floats на точку
// [i*4+0] = x       (0..1)
// [i*4+1] = y       (0..1)
// [i*4+2] = value   (0..1)
// [i*4+3] = active  (0 або 1)

let intervalId: ReturnType<typeof setInterval> | null = null
let pointCount  = 100
let frameIndex  = 0

// Позиції генеруємо один раз — вони фіксовані, змінюється лише value
const posX = new Float32Array(100_000)
const posY = new Float32Array(100_000)
for (let i = 0; i < 100_000; i++) {
    posX[i] = Math.random()
    posY[i] = Math.random()
}

// Буфер для поточного кадру — повторно використовуємо (без reallocate кожен кадр)
// Максимальний розмір — 100K точок
const frameBuf = new Float32Array(100_000 * 4)

function generateFrame(): { buf: Float32Array; count: number } {
    frameIndex++
    const wave = Math.sin(frameIndex * 0.05) * 0.5 + 0.5

    for (let i = 0; i < pointCount; i++) {
        const i4    = i * 4
        const value = Math.min(1, Math.max(0, wave + (Math.random() - 0.5) * 0.3))
        frameBuf[i4]     = posX[i]
        frameBuf[i4 + 1] = posY[i]
        frameBuf[i4 + 2] = value
        frameBuf[i4 + 3] = Math.random() > 0.8 ? 1 : 0  // ~20% active
    }

    // Повертаємо slice (копія потрібного діапазону) — worker зберігає оригінал frameBuf
    // для наступного кадру. Slice = бінарна копія, не серіалізація об'єктів.
    return {
        buf:   frameBuf.slice(0, pointCount * 4),
        count: pointCount,
    }
}

self.onmessage = (e: MessageEvent) => {
    const { type, payload } = e.data

    if (type === 'SET_COUNT') {
        pointCount = Math.min(100_000, Math.max(10, Number(payload)))
    }

    if (type === 'START') {
        if (intervalId) clearInterval(intervalId)
        intervalId = setInterval(() => {
            const { buf, count } = generateFrame()
            // Без transfer — головний потік отримує бінарну копію (~0.5мс),
            // worker зберігає свій frameBuf для наступного кадру
            self.postMessage({ type: 'FRAME', buf, count })
        }, 16)
    }

    if (type === 'STOP') {
        if (intervalId) { clearInterval(intervalId); intervalId = null }
    }
}