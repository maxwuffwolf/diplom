// Цей файл виконується у фоновому потоці (окремий від браузерного UI)
// Генерує масив точок з координатами та кольором з частотою 60 Гц

export interface DataPoint {
    id: number
    x: number       // 0..1 (нормалізовані координати)
    y: number       // 0..1
    value: number   // 0..1 (використовується для кольору/висоти)
    active: boolean
}

let intervalId: ReturnType<typeof setInterval> | null = null
let pointCount = 100
let frameIndex = 0

// Генеруємо початкові позиції один раз (позиції фіксовані, змінюється лише value)
const positions: { x: number; y: number }[] = []
for (let i = 0; i < 100_000; i++) {
    positions.push({
        x: Math.random(),
        y: Math.random(),
    })
}

function generateFrame(): DataPoint[] {
    frameIndex++
    const wave = Math.sin(frameIndex * 0.05) * 0.5 + 0.5

    // Створюємо тільки потрібну кількість точок (pointCount)
    const points: DataPoint[] = []
    for (let i = 0; i < pointCount; i++) {
        points.push({
            id: i,
            x: positions[i].x,
            y: positions[i].y,
            // Значення — синусоїдальна хвиля з шумом (імітує телеметрію)
            value: Math.min(1, Math.max(0, wave + (Math.random() - 0.5) * 0.3)),
            active: Math.random() > 0.8,
        })
    }
    return points
}

// Слухаємо команди з головного потоку
self.onmessage = (e: MessageEvent) => {
    const { type, payload } = e.data

    if (type === 'SET_COUNT') {
        pointCount = Math.min(100_000, Math.max(10, payload))
    }

    if (type === 'START') {
        if (intervalId) clearInterval(intervalId)
        // Кожні 16 мс = 60 Гц
        intervalId = setInterval(() => {
            const data = generateFrame()
            // postMessage з Transferable не підходить для масиву об'єктів,
            // тому передаємо JSON-сумісний масив напряму
            self.postMessage({ type: 'FRAME', payload: data })
        }, 16)
    }

    if (type === 'STOP') {
        if (intervalId) clearInterval(intervalId)
        intervalId = null
    }
}