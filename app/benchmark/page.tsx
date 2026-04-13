import Link from 'next/link'
import { BenchmarkControl } from '@/components/benchmark/BenchmarkControl'

export default function BenchmarkPage() {
  return (
    <main className="page">
      <header className="header">
        <h1>SSR vs CSR vs SSG Benchmark Control</h1>
        <p className="sub">
          Unified dataset/components, payload presets, metric overlay, serial runs, median/percentile export.
        </p>
      </header>

      <section className="content benchmark-panel" style={{ marginBottom: 12 }}>
        <div className="form-row">
          <Link href="/csr/small" className="pill">
            Open /csr
          </Link>
          <Link href="/ssr/small" className="pill">
            Open /ssr
          </Link>
          <Link href="/ssg/small" className="pill">
            Open /ssg
          </Link>
        </div>
      </section>

      <section className="content">
        <BenchmarkControl />
      </section>
    </main>
  )
}
