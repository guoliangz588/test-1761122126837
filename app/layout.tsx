import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'UI Tool Server',
  description: 'Dynamic UI component server running on localhost:4000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  )
}