import { NextRequest, NextResponse } from 'next/server'
import {
  generateDataset,
  SIMULATED_API_DELAY_MS,
  wait,
  type PayloadSize,
} from '@/lib/benchmark'

const SIZES = new Set<PayloadSize>(['small', 'medium', 'large'])

export async function GET(request: NextRequest) {
  const rawSize = request.nextUrl.searchParams.get('size')
  const size = (rawSize && SIZES.has(rawSize as PayloadSize) ? rawSize : 'small') as PayloadSize

  await wait(SIMULATED_API_DELAY_MS)
  const payload = generateDataset(size)

  return NextResponse.json(payload)
}
