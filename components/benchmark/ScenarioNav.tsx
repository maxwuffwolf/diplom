import Link from 'next/link'
import type { PayloadSize, RenderMode } from '@/lib/benchmark'

const MODES: RenderMode[] = ['csr', 'ssr', 'ssg']
const SIZES: PayloadSize[] = ['small', 'medium', 'large']

export function ScenarioNav({ mode, size }: { mode: RenderMode; size: PayloadSize }) {
  return (
    <div className="controls">
      {MODES.map((entryMode) => (
        <Link key={entryMode} href={`/${entryMode}/${size}`} className={`pill ${entryMode === mode ? 'active' : ''}`}>
          /{entryMode}
        </Link>
      ))}
      {SIZES.map((entrySize) => (
        <Link
          key={entrySize}
          href={`/${mode}/${entrySize}`}
          className={`pill ${entrySize === size ? 'active' : ''}`}
        >
          {entrySize}
        </Link>
      ))}
      <Link href="/benchmark" className="pill">
        Benchmark Control
      </Link>
    </div>
  )
}
