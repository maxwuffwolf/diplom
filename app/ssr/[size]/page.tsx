import { notFound } from 'next/navigation'
import { DatasetView } from '@/components/benchmark/DatasetView'
import { RuntimeMetrics } from '@/components/benchmark/RuntimeMetrics'
import { ScenarioNav } from '@/components/benchmark/ScenarioNav'
import { generateDataset, wait, type PayloadSize } from '@/lib/benchmark'

const SIZES: PayloadSize[] = ['small', 'medium', 'large']

export const dynamic = 'force-dynamic'

export default async function SsrPage({
  params,
  searchParams,
}: {
  params: Promise<{ size: string }>
  searchParams: Promise<{ autorun?: string; run?: string }>
}) {
  const { size } = await params
  if (!SIZES.includes(size as PayloadSize)) notFound()

  await wait(120)
  const payload = generateDataset(size as PayloadSize)
  const query = await searchParams

  return (
    <main className="page">
      <header className="header">
        <h1>SSR page: render on every request</h1>
        <p className="sub">Однаковий dataset/UI/DOM, відрізняється лише спосіб рендеру.</p>
      </header>
      <ScenarioNav mode="ssr" size={size as PayloadSize} />
      <DatasetView items={payload.items} mode="ssr" size={size as PayloadSize} />
      <RuntimeMetrics
        mode="ssr"
        size={size as PayloadSize}
        autoReport={query.autorun === '1'}
        run={query.run ?? 'manual'}
      />
    </main>
  )
}
