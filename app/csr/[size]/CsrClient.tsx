'use client'

import { useEffect, useState } from 'react'
import { DatasetView } from '@/components/benchmark/DatasetView'
import { RuntimeMetrics } from '@/components/benchmark/RuntimeMetrics'
import { ScenarioNav } from '@/components/benchmark/ScenarioNav'
import type { PayloadSize, ScenarioPayload } from '@/lib/benchmark'

export function CsrClient({
  size,
  autoReport,
  run,
}: {
  size: PayloadSize
  autoReport: boolean
  run: string
}) {
  const [payload, setPayload] = useState<ScenarioPayload | null>(null)

  useEffect(() => {
    let active = true
    const params = new URLSearchParams({ size })
    fetch(`/api/benchmark?${params.toString()}`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((data: ScenarioPayload) => {
        if (active) setPayload(data)
      })
    return () => {
      active = false
    }
  }, [size])

  return (
    <main className="page">
      <header className="header">
        <h1>CSR page: data load after mount</h1>
        <p className="sub">Однаковий dataset/UI/DOM, відрізняється лише спосіб рендеру.</p>
      </header>
      <ScenarioNav mode="csr" size={size} />
      {payload ? (
        <DatasetView items={payload.items} mode="csr" size={size} />
      ) : (
        <section className="content benchmark-panel">Loading payload...</section>
      )}
      <RuntimeMetrics mode="csr" size={size} autoReport={autoReport} run={run} />
    </main>
  )
}
