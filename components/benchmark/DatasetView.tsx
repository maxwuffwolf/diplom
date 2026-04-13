import type { BenchmarkItem, PayloadSize, RenderMode } from '@/lib/benchmark'

function avg(values: number[]) {
  if (!values.length) return 0
  return values.reduce((acc, value) => acc + value, 0) / values.length
}

export function DatasetView({
  items,
  mode,
  size,
}: {
  items: BenchmarkItem[]
  mode: RenderMode
  size: PayloadSize
}) {
  const values = items.map((item) => item.value)
  const scores = items.map((item) => item.score)
  const maxValue = Math.max(...values, 1)
  const topBars = items.slice(0, 60)

  return (
    <section className="content">
      <div className="dataset-grid">
        <article className="card">
          <h3>Render mode</h3>
          <p>{mode.toUpperCase()}</p>
        </article>
        <article className="card">
          <h3>Payload size</h3>
          <p>{size.toUpperCase()}</p>
        </article>
        <article className="card">
          <h3>Nodes</h3>
          <p>{items.length.toLocaleString()}</p>
        </article>
        <article className="card">
          <h3>Avg value</h3>
          <p>{avg(values).toFixed(2)}</p>
        </article>
        <article className="card">
          <h3>Avg score</h3>
          <p>{avg(scores).toFixed(2)}</p>
        </article>
        <article className="card">
          <h3>Max value</h3>
          <p>{maxValue.toFixed(2)}</p>
        </article>
      </div>

      <div className="visuals">
        <div className="chart">
          <h3>Sample bars (same component for all modes)</h3>
          <svg viewBox="0 0 600 180" preserveAspectRatio="none" role="img" aria-label="Benchmark bars">
            {topBars.map((item, index) => {
              const barWidth = 600 / topBars.length
              const height = (item.value / maxValue) * 160
              const x = index * barWidth
              const y = 170 - height
              return (
                <rect
                  key={item.id}
                  x={x}
                  y={y}
                  width={Math.max(2, barWidth - 1)}
                  height={height}
                  fill={item.segment === 'alpha' ? '#22d3ee' : item.segment === 'beta' ? '#818cf8' : '#34d399'}
                />
              )
            })}
          </svg>
        </div>

        <div className="list">
          <h3>Rendered DOM rows (payload-dependent)</h3>
          <div className="list-scroll">
            {items.map((item) => (
              <div key={item.id} className="row">
                <span>
                  {item.label} · {item.segment}
                </span>
                <span>
                  {item.value.toFixed(1)} / {item.score.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
