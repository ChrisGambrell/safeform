import Link from 'next/link'

export default function Home() {
  return (
    <main>
      <h1>safeform examples</h1>
      <ul>
        <li><Link href="/employee">Employee form (single-step)</Link></li>
        <li><Link href="/contact">Contact form (public, no auth)</Link></li>
      </ul>
    </main>
  )
}
