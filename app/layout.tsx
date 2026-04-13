import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SSR / CSR / SSG Benchmark',
  description: 'Benchmark layout for comparing rendering strategies',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.__BENCHMARK_HYDRATION_START__ = window.__BENCHMARK_HYDRATION_START__ || performance.now();",
          }}
        />
        {children}
      </body>
    </html>
  )
}
