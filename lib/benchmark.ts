export type RenderMode = 'csr' | 'ssr' | 'ssg'
export type PayloadSize = 'small' | 'medium' | 'large'

export interface BenchmarkItem {
  id: number
  label: string
  segment: 'alpha' | 'beta' | 'gamma'
  value: number
  score: number
}

export interface ScenarioPayload {
  size: PayloadSize
  generatedAt: string
  items: BenchmarkItem[]
}

export const PAYLOAD_COUNTS: Record<PayloadSize, number> = {
  small: 120,
  medium: 900,
  large: 3200,
}

const SEGMENTS: BenchmarkItem['segment'][] = ['alpha', 'beta', 'gamma']

export const SIMULATED_NETWORK_DELAY_MS = 120

/**
 * Deterministic pseudo-random generator (LCG) used to keep datasets reproducible
 * across CSR/SSR/SSG runs for fair benchmark comparisons.
 */
function seeded(seed: number) {
  let state = seed % 2147483647
  if (state <= 0) state += 2147483646
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

export function generateDataset(size: PayloadSize): ScenarioPayload {
  const count = PAYLOAD_COUNTS[size]
  const rand = seeded(count * 97)
  const items: BenchmarkItem[] = Array.from({ length: count }, (_, i) => {
    const value = Math.round(rand() * 1000) / 10
    const score = Math.round((0.35 * value + rand() * 35) * 100) / 100
    return {
      id: i + 1,
      label: `Node-${String(i + 1).padStart(4, '0')}`,
      segment: SEGMENTS[i % SEGMENTS.length],
      value,
      score,
    }
  })

  return {
    size,
    generatedAt: new Date().toISOString(),
    items,
  }
}

export async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export function percentile(values: number[], percentileValue: number) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1),
  )
  return Number(sorted[index].toFixed(2))
}

export function toCsv(records: Array<Record<string, string | number>>) {
  if (!records.length) return ''
  const headers = Object.keys(records[0])
  const lines = [headers.join(',')]
  for (const record of records) {
    lines.push(headers.map((header) => JSON.stringify(record[header] ?? '')).join(','))
  }
  return lines.join('\n')
}
