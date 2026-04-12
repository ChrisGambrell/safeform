import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'safeform example',
  description: 'End-to-end type-safe forms with safeform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
        {children}
      </body>
    </html>
  )
}
