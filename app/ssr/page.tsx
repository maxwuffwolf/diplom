import { redirect } from 'next/navigation'

export default function SsrRootPage() {
  redirect('/ssr/small')
}
