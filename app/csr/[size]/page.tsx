import { notFound } from 'next/navigation'
import type { PayloadSize } from '@/lib/benchmark'
import { CsrClient } from './CsrClient'

const SIZES: PayloadSize[] = ['small', 'medium', 'large']

export default async function CsrPage({
  params,
  searchParams,
}: {
  params: Promise<{ size: string }>
  searchParams: Promise<{ autorun?: string; run?: string }>
}) {
  const { size } = await params
  if (!SIZES.includes(size as PayloadSize)) notFound()

  const query = await searchParams

  return <CsrClient size={size as PayloadSize} autoReport={query.autorun === '1'} run={query.run ?? 'manual'} />
}
