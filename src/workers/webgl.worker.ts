// Цей Worker містить ВЕСЬ Three.js рендеринг.
// Він повністю ізольований від головного потоку —
// навіть якщо DOM-панель заморозить головний потік на 500 мс,
// цей Worker продовжує рендерити на GPU без жодних затримок.

import * as THREE from 'three'

const MAX_POINTS = 100_000

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene
let camera: THREE.OrthographicCamera
let pointsMesh: THREE.Points
let positions: Float32Array
let colors: Float32Array
let sizes: Float32Array

// --- FPS лічильник (власний, незалежний від головного потоку) ---
let frameCount = 0
let lastFpsTime = performance.now()

// --- Ініціалізація Three.js з OffscreenCanvas ---
function init(canvas: OffscreenCanvas, width: number, height: number) {
    renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(1) // Worker не має доступу до devicePixelRatio
    renderer.setSize(width, height, false)
    renderer.setClearColor(0x030712, 1)

    camera = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1)
    scene = new THREE.Scene()

    positions = new Float32Array(MAX_POINTS * 3)
    colors    = new Float32Array(MAX_POINTS * 3)
    sizes     = new Float32Array(MAX_POINTS)
    positions.fill(0)
    colors.fill(0.3)
    sizes.fill(5)

    const geometry = new THREE.BufferGeometry()
    const posAttr  = new THREE.BufferAttribute(positions, 3)
    const colAttr  = new THREE.BufferAttribute(colors, 3)
    const sizeAttr = new THREE.BufferAttribute(sizes, 1)
    posAttr.setUsage(THREE.DynamicDrawUsage)
    colAttr.setUsage(THREE.DynamicDrawUsage)
    sizeAttr.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('position', posAttr)
    geometry.setAttribute('color',    colAttr)
    geometry.setAttribute('size',     sizeAttr)
    geometry.setDrawRange(0, 0)

    // Шейдер без `attribute vec3 color` в окремому рядку —
    // vertexColors: true + BufferAttribute 'color' достатньо
    const material = new THREE.ShaderMaterial({
        vertexShader: `
      attribute float size;
      varying vec3 vColor;
      void main() {
        vColor = color;
        gl_PointSize = size;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
        fragmentShader: `
      varying vec3 vColor;
      void main() {
        vec2 coord = gl_PointCoord - vec2(0.5);
        if (length(coord) > 0.5) discard;
        gl_FragColor = vec4(vColor, 1.0);
      }
    `,
        vertexColors: true,
    })

    pointsMesh = new THREE.Points(geometry, material)
    scene.add(pointsMesh)

    // Власний RAF-цикл Worker — повністю незалежний від головного потоку
    const animate = () => {
        self.requestAnimationFrame(animate)
        if (!renderer) return

        renderer.render(scene, camera)

        // Рахуємо FPS всередині Worker
        frameCount++
        const now = performance.now()
        const elapsed = now - lastFpsTime
        if (elapsed >= 500) {
            const fps = Math.round((frameCount / elapsed) * 1000)
            const frameTime = parseFloat((elapsed / frameCount).toFixed(1))
            self.postMessage({ type: 'METRICS', fps, frameTime })
            frameCount = 0
            lastFpsTime = now
        }
    }
    self.requestAnimationFrame(animate)
}

// --- Оновлення даних (викликається з головного потоку) ---
function updatePoints(dataPoints: any[], scenario: string) {
    if (!pointsMesh) return

    if (!dataPoints || dataPoints.length === 0) {
        pointsMesh.geometry.setDrawRange(0, 0)
        return
    }

    const count = Math.min(dataPoints.length, MAX_POINTS)
    pointsMesh.geometry.setDrawRange(0, count)

    for (let i = 0; i < count; i++) {
        const p  = dataPoints[i]
        const i3 = i * 3
        positions[i3]     = p.x
        positions[i3 + 1] = 1 - p.y
        positions[i3 + 2] = 0
        colors[i3]     = p.value * 0.9
        colors[i3 + 1] = p.value * 0.35
        colors[i3 + 2] = (1 - p.value) * 0.9
        sizes[i] = scenario === 'lod' && p.active ? 12 : 5
    }

    pointsMesh.geometry.attributes.position.needsUpdate = true
    pointsMesh.geometry.attributes.color.needsUpdate    = true
    pointsMesh.geometry.attributes.size.needsUpdate     = true
}

// --- Обробник повідомлень від головного потоку ---
self.onmessage = (e: MessageEvent) => {
    const { type, payload } = e.data

    if (type === 'INIT') {
        // payload: { canvas: OffscreenCanvas, width, height }
        init(payload.canvas, payload.width, payload.height)
    }

    if (type === 'RESIZE') {
        renderer?.setSize(payload.width, payload.height, false)
    }

    if (type === 'UPDATE') {
        // payload: { points, scenario }
        updatePoints(payload.points, payload.scenario)
    }

    if (type === 'CLEAR') {
        if (pointsMesh) pointsMesh.geometry.setDrawRange(0, 0)
    }
}