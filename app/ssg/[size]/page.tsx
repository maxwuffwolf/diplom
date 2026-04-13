import { notFound } from 'next/navigation'
import { DatasetView } from '@/components/benchmark/DatasetView'
import { RuntimeMetrics } from '@/components/benchmark/RuntimeMetrics'
import { ScenarioNav } from '@/components/benchmark/ScenarioNav'
import { generateDataset, type PayloadSize } from '@/lib/benchmark'

const SIZES: PayloadSize[] = ['small', 'medium', 'large']

export const dynamic = 'force-static'

export function generateStaticParams() {
  return SIZES.map((size) => ({ size }))
}

export default async function SsgPage({
  params,
  searchParams,
}: {
  params: Promise<{ size: string }>
  searchParams: Promise<{ autorun?: string; run?: string }>
}) {
  const { size } = await params
  if (!SIZES.includes(size as PayloadSize)) notFound()

  const payload = generateDataset(size as PayloadSize)
  const query = await searchParams

  return (
    <main className="page">
      <header className="header">
        <h1>SSG page: statically generated at build</h1>
        <p className="sub">Однаковий dataset/UI/DOM, відрізняється лише спосіб рендеру.</p>
      </header>
      <ScenarioNav mode="ssg" size={size as PayloadSize} />
      <DatasetView items={payload.items} mode="ssg" size={size as PayloadSize} />
      <RuntimeMetrics
        mode="ssg"
        size={size as PayloadSize}
        autoReport={query.autorun === '1'}
        run={query.run ?? 'manual'}
      />
    </main>
  )
}
