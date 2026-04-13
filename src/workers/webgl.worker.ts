// webgl.worker.ts — без змін у логіці порівняно з попередньою версією.
// Вже приймає Float32Array. Два mesh-и: scatter + bar (InstancedMesh).

import * as THREE from 'three'

const MAX_SCATTER = 100_000
const MAX_BARS    = 500

let renderer: THREE.WebGLRenderer | null = null
let scene:    THREE.Scene
let camera:   THREE.OrthographicCamera

// Scatter
let scatterMesh: THREE.Points
let sPos:  Float32Array
let sCol:  Float32Array
let sSize: Float32Array

// Bars (InstancedMesh)
let barMesh: THREE.InstancedMesh
const _mat   = new THREE.Matrix4()
const _pos   = new THREE.Vector3()
const _quat  = new THREE.Quaternion()
const _scale = new THREE.Vector3()
const _color = new THREE.Color()

// FPS counter
let frameCount  = 0
let lastFpsTime = performance.now()

function init(canvas: OffscreenCanvas, width: number, height: number) {
    if (renderer) return

    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
    renderer.setPixelRatio(1)
    renderer.setSize(width, height, false)
    renderer.setClearColor(0x030712, 1)

    // left=0, right=1, top=1, bottom=0 → X:0..1, Y:0..1 (Y=0 знизу, Y=1 зверху)
    camera = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1)
    scene  = new THREE.Scene()

    // ── Scatter mesh ──────────────────────────────────────────────────────────
    sPos  = new Float32Array(MAX_SCATTER * 3)
    sCol  = new Float32Array(MAX_SCATTER * 3)
    sSize = new Float32Array(MAX_SCATTER)
    sPos.fill(0); sCol.fill(0.3); sSize.fill(5)

    const geo     = new THREE.BufferGeometry()
    const posAttr = new THREE.BufferAttribute(sPos, 3)
    const colAttr = new THREE.BufferAttribute(sCol, 3)
    const szAttr  = new THREE.BufferAttribute(sSize, 1)
    posAttr.setUsage(THREE.DynamicDrawUsage)
    colAttr.setUsage(THREE.DynamicDrawUsage)
    szAttr.setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute('position', posAttr)
    geo.setAttribute('color',    colAttr)
    geo.setAttribute('size',     szAttr)
    geo.setDrawRange(0, 0)

    const scatterMat = new THREE.ShaderMaterial({
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
        vec2 c = gl_PointCoord - 0.5;
        if (length(c) > 0.5) discard;
        gl_FragColor = vec4(vColor, 1.0);
      }
    `,
        vertexColors: true,
    })
    scatterMesh = new THREE.Points(geo, scatterMat)
    scene.add(scatterMesh)

    // ── Bar mesh (InstancedMesh) ──────────────────────────────────────────────
    const barGeo = new THREE.PlaneGeometry(1, 1)
    const barMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })
    barMesh      = new THREE.InstancedMesh(barGeo, barMat, MAX_BARS)
    barMesh.visible = false
    barMesh.count   = 0
    scene.add(barMesh)

    // ── RAF loop (повністю незалежний від головного потоку) ───────────────────
    const animate = () => {
        self.requestAnimationFrame(animate)
        if (!renderer) return
        renderer.render(scene, camera)

        frameCount++
        const now     = performance.now()
        const elapsed = now - lastFpsTime
        if (elapsed >= 500) {
            const fps       = Math.round((frameCount / elapsed) * 1000)
            const frameTime = parseFloat((elapsed / frameCount).toFixed(1))
            self.postMessage({ type: 'METRICS', fps, frameTime })
            frameCount  = 0
            lastFpsTime = now
        }
    }
    self.requestAnimationFrame(animate)
}

function update(buf: Float32Array, count: number, scenario: string) {
    if (!scatterMesh || !barMesh) return

    if (scenario === 'reactive') {
        scatterMesh.visible = false
        barMesh.visible     = true

        const n = Math.min(count, MAX_BARS)
        barMesh.count = n

        for (let i = 0; i < n; i++) {
            const v = buf[i * 4 + 2]
            // Y=0 знизу → бар росте від низу вгору
            // центр бару: y = v/2, висота = v
            _pos.set((i + 0.5) / n, v / 2, 0)
            _scale.set(0.85 / n, Math.max(0.002, v), 1)
            _mat.compose(_pos, _quat, _scale)
            barMesh.setMatrixAt(i, _mat)
            _color.setRGB(v * 0.9, v * 0.35, (1 - v) * 0.9)
            barMesh.setColorAt(i, _color)
        }

        barMesh.instanceMatrix.needsUpdate = true
        if (barMesh.instanceColor) barMesh.instanceColor.needsUpdate = true

    } else {
        scatterMesh.visible = true
        barMesh.visible     = false

        const n = Math.min(count, MAX_SCATTER)
        scatterMesh.geometry.setDrawRange(0, n)

        for (let i = 0; i < n; i++) {
            const i4 = i * 4
            const i3 = i * 3
            sPos[i3]     = buf[i4]
            sPos[i3 + 1] = 1 - buf[i4 + 1]   // інвертуємо Y
            sPos[i3 + 2] = 0

            const v = buf[i4 + 2]
            sCol[i3]     = v * 0.9
            sCol[i3 + 1] = v * 0.35
            sCol[i3 + 2] = (1 - v) * 0.9

            sSize[i] = (scenario === 'lod' && buf[i4 + 3] > 0.5) ? 14 : 5
        }

        scatterMesh.geometry.attributes.position.needsUpdate = true
        scatterMesh.geometry.attributes.color.needsUpdate    = true
        scatterMesh.geometry.attributes.size.needsUpdate     = true
    }
}

self.onmessage = (e: MessageEvent) => {
    const { type, payload } = e.data
    if (type === 'INIT')   init(payload.canvas, payload.width, payload.height)
    if (type === 'RESIZE') renderer?.setSize(payload.width, payload.height, false)
    if (type === 'UPDATE') update(payload.buf, payload.count, payload.scenario)
    if (type === 'CLEAR') {
        if (scatterMesh) scatterMesh.geometry.setDrawRange(0, 0)
        if (barMesh)     barMesh.count = 0
    }
}